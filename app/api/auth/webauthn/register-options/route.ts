// app/api/auth/webauthn/register-options/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Passkey } from "@prisma/client";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getWebAuthnRP } from "@/lib/webauthnRP";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";

/** helpers */
function bufferToBase64url(buf: Buffer | Uint8Array | ArrayBuffer) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf as any);
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function toBuffer(input: unknown): Buffer {
  if (Buffer.isBuffer(input)) return input;
  if (typeof input === "string") {
    const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    return Buffer.from(b64 + pad, "base64");
  }
  if (input instanceof ArrayBuffer) return Buffer.from(new Uint8Array(input));
  if (ArrayBuffer.isView(input)) return Buffer.from(input as any);
  throw new Error("Unsupported input type");
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "unknown";

    // Rate Limit: 1 IP / 5 min / 5 requests
    if (
      !checkRateLimit(ip, "register-options", {
        interval: 5 * 60 * 1000,
        limit: 5,
      })
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "リクエスト回数が多すぎます。しばらく待ってから再試行してください。",
        },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { email } = body ?? {};

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { ok: false, message: "メールアドレスが入力されていません" },
        { status: 400 },
      );
    }

    const emailLower = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: emailLower } });
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "登録されていないメールアドレスです" },
        { status: 404 },
      );
    }

    // IP Restriction Check
    if (user.allowedIps && user.allowedIps.length > 0) {
      // split x-forwarded-for just in case it's a list
      const clientIp = ip.split(",")[0].trim();
      if (!user.allowedIps.includes(clientIp)) {
        return NextResponse.json(
          {
            ok: false,
            message: "このネットワークからの登録は許可されていません",
          },
          { status: 403 },
        );
      }
    }

    const existing: Passkey[] = await prisma.passkey.findMany({
      where: { userId: user.id },
    });

    const { rpID } = getWebAuthnRP();
    const userIDBuf = Buffer.from(String(user.id), "utf8");

    const opts = await generateRegistrationOptions({
      rpName: "My-FridgeAI",
      rpID,
      userID: userIDBuf,
      userName: user.email ?? emailLower,
      userDisplayName: user.name ?? user.email ?? emailLower,
      timeout: 60000,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      excludeCredentials: existing.length
        ? existing.map((p: Passkey) => ({
            id: p.credentialId,
            type: "public-key" as const,
          }))
        : undefined,
    });

    if (!opts?.challenge) {
      return NextResponse.json(
        { ok: false, message: "登録チャレンジの生成に失敗しました" },
        { status: 500 },
      );
    }

    const challengeStr =
      typeof opts.challenge === "string"
        ? opts.challenge
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "")
        : bufferToBase64url(toBuffer(opts.challenge));

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verifyToken: challengeStr,
        verifyTokenCreatedAt: new Date(), // Set creation time for 5 min expiry check
      },
    });

    console.log(
      `[webauthn][register-options] challenge 作成成功: userId=${user.id}`,
    );

    const jsonSafeOpts: any = { ...opts, challenge: challengeStr };

    jsonSafeOpts.user = {
      id: bufferToBase64url(userIDBuf),
      name: user.email,
      displayName: user.name ?? user.email,
    };

    if (Array.isArray(jsonSafeOpts.excludeCredentials)) {
      jsonSafeOpts.excludeCredentials = jsonSafeOpts.excludeCredentials.map(
        (c: any) => ({
          ...c,
          id:
            typeof c.id === "string" ? c.id : bufferToBase64url(toBuffer(c.id)),
        }),
      );
    }

    if (!jsonSafeOpts.rpId && rpID) jsonSafeOpts.rpId = rpID;

    return NextResponse.json({ ok: true, options: jsonSafeOpts });
  } catch (err) {
    console.error("[register-options] error:", err);
    return NextResponse.json(
      { ok: false, message: "サーバーでエラーが発生しました" },
      { status: 500 },
    );
  }
}
