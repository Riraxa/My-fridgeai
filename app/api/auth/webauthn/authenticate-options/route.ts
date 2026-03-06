// app/api/auth/webauthn/authenticate-options/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getWebAuthnRP } from "@/lib/webauthnRP";
import type { Passkey } from "@prisma/client";
import { AUTH_ERROR_MESSAGES } from "@/lib/security";

/** helpers */
function bufferToBase64url(buf: Buffer | Uint8Array | ArrayBuffer) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf as Uint8Array);
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body ?? {};

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { ok: false, message: "メールアドレスが必要です。" },
        { status: 400 },
      );
    }

    const { rpID } = getWebAuthnRP();
    const emailLower = email.toLowerCase().trim();

    // 1. Find user
    const user = await prisma.user.findUnique({ where: { email: emailLower } });
    if (!user) {
      // 安全性：ユーザー存在の有無にかかわらず統一メッセージで列挙攻撃を防止
      console.warn(
        `[webauthn authenticate-options] User not found: ${emailLower}`,
      );
      return NextResponse.json(
        {
          ok: false,
          message: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
        },
        { status: 404 },
      );
    }

    // 2. Check for passkeys
    const passkeys: Passkey[] = await prisma.passkey.findMany({
      where: { userId: user.id },
    });
    if (passkeys.length === 0) {
      console.warn(
        `[webauthn authenticate-options] No passkeys found for user: ${emailLower}`,
      );
      return NextResponse.json(
        {
          ok: false,
          message: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS, // 統一メッセージで情報漏洩防止
        },
        { status: 400 },
      );
    }

    // 3. Build allowCredentials
    // NOTE: omit 'transports' to avoid restricting authenticators (some browsers/platforms are picky).
    // Keep only id (base64url) and type. This helps platform authenticators (internal) surface.
    const allowedCredentials = passkeys.map((pk) => {
      let transports: string[] = [];
      try {
        if (pk.transports) {
          transports = JSON.parse(pk.transports);
        }
      } catch {
        // ignore parse error
      }
      return {
        id: pk.credentialId, // stored as base64url in DB
        type: "public-key" as const,
        transports: transports as AuthenticatorTransport[],
      };
    });

    // 4. Generate options
    const opts = await generateAuthenticationOptions({
      timeout: 60000,
      rpID,
      allowCredentials: allowedCredentials,
      // Keep userVerification as 'preferred' to be compatible with many keys;
      // If you want to force platform UV-only, consider 'required' (may break some cross-platform keys).
      userVerification: "preferred",
    });

    if (!opts?.challenge) {
      console.error("[authenticate-options] no challenge generated:", opts);
      return NextResponse.json(
        { ok: false, message: "challenge generation failed" },
        { status: 500 },
      );
    }

    // 5. Normalize challenge -> base64url string
    const challengeStr =
      typeof opts.challenge === "string"
        ? opts.challenge
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "")
        : bufferToBase64url(opts.challenge as Buffer);

    // 6. Store challenge in User table (valid for 5 mins)
    const expires = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken: challengeStr, verifyExpires: expires },
    });

    // 7. Prepare response (JSON-safe options)
    const jsonSafeOpts: any = { ...opts, challenge: challengeStr };

    if (Array.isArray(jsonSafeOpts.allowCredentials)) {
      jsonSafeOpts.allowCredentials = jsonSafeOpts.allowCredentials.map(
        (c: any) => ({
          ...c,
          // normalize id to base64url string
          id:
            typeof c.id === "string"
              ? c.id.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
              : bufferToBase64url(c.id),
        }),
      );
    }

    if (!jsonSafeOpts.rpId && rpID) jsonSafeOpts.rpId = rpID;

    return NextResponse.json(
      { ok: true, options: jsonSafeOpts },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[authenticate-options] error:", err);
    return NextResponse.json(
      { ok: false, message: "サーバーエラーが発生しました。" },
      { status: 500 },
    );
  }
}
