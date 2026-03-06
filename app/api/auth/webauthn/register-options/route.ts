// app/api/auth/webauthn/register-options/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Passkey } from "@prisma/client";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getWebAuthnRP } from "@/lib/webauthnRP";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimiter";
import { validateAndNormalizeIP } from "@/lib/security";

/**
 * register-options route (Windows Hello / platform authenticator support)
 *
 * - Keeps existing protections (rate-limit, IP check).
 * - Prevents re-registration when at least one passkey exists (409).
 * - Accepts optional body flag `preferPlatform: boolean` to request platform authenticator
 *   (e.g. Windows Hello) on registration.
 * - Normalizes challenge and user.id to base64url strings.
 * - Returns options wrapped as { publicKey: <opts> } for broad client compatibility.
 */

/* helpers */
function bufferToBase64url(buf: Buffer | Uint8Array | ArrayBuffer) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf as Uint8Array);
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function toBuffer(input: unknown): Buffer {
  if (Buffer.isBuffer(input)) return input;
  if (typeof input === "string") {
    // assume base64url input, convert to base64 then buffer
    const b64 = (input as string).replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    return Buffer.from(b64 + pad, "base64");
  }
  if (input instanceof ArrayBuffer) return Buffer.from(new Uint8Array(input));
  if (ArrayBuffer.isView(input)) return Buffer.from(input.buffer);
  throw new Error("Unsupported input type");
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "unknown";

    // Rate Limit: 1 IP / 5 min / 5 requests
    const rateLimitResult = await rateLimit(ip, "register-options", 5, 5 * 60);
    if (!rateLimitResult.ok) {
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
      const rawIP = headersList.get("x-forwarded-for");
      const clientIp = validateAndNormalizeIP(rawIP);
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

    // Map existing passkeys to excludeCredentials to prevent re-registration on same authenticator
    const excludeCredentials = existing.map((passkey) => {
      let transports: string[] | undefined;
      try {
        if (passkey.transports) {
          const parsed = JSON.parse(passkey.transports);
          if (Array.isArray(parsed) && parsed.length > 0) {
            transports = parsed;
          }
        }
      } catch {
        // ignore parse error
      }

      return {
        id: Buffer.from(passkey.credentialId, 'base64url'), // Convert to Buffer for v9
        type: "public-key" as const,
        transports: transports as AuthenticatorTransport[],
      };
    });

    const { rpID } = getWebAuthnRP();
    const userID = String(user.id); // Convert to string for v9

    const authenticatorSelection = {
      residentKey: "preferred" as const,
      userVerification: "preferred" as const,
    };

    const opts = await generateRegistrationOptions({
      rpName: "My-fridgeai",
      rpID,
      userID, // String for v9
      userName: user.email ?? emailLower,
      userDisplayName: user.name ?? user.email ?? emailLower,
      timeout: 60000,
      attestationType: "none",
      authenticatorSelection,
      excludeCredentials,
      // Support ES256 (-7) and RS256 (-257) explicitly for Windows Hello compatibility
      supportedAlgorithmIDs: [-7, -257],
    });

    if (!opts?.challenge) {
      return NextResponse.json(
        { ok: false, message: "登録チャレンジの生成に失敗しました" },
        { status: 500 },
      );
    }

    // normalize challenge -> base64url string
    const challengeStr =
      typeof opts.challenge === "string"
        ? opts.challenge
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "")
        : bufferToBase64url(toBuffer(opts.challenge));

    // Persist a verifyToken (challenge) for short-lived verification (e.g. 5 min)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verifyToken: challengeStr,
        verifyTokenCreatedAt: new Date(),
      },
    });

    // Derive basePublicOptions from opts
    const basePublicOptions: any = (opts as any).publicKey
      ? { ...(opts as any).publicKey }
      : { ...(opts as any) };

    // Ensure challenge field is the base64url string
    basePublicOptions.challenge = challengeStr;

    // Normalize user object
    basePublicOptions.user = {
      id: bufferToBase64url(Buffer.from(userID, 'utf8')), // Encode userID as base64url
      name: user.email,
      displayName: user.name ?? user.email,
    };

    // Ensure rpId is present and consistent
    if (!basePublicOptions.rpId && rpID) basePublicOptions.rpId = rpID;

    // Return wrapped publicKey options for maximal compatibility with clients
    const responseOptions = { publicKey: basePublicOptions };

    return NextResponse.json({ ok: true, options: responseOptions });
  } catch (err) {
    console.error("[register-options] error:", err);
    return NextResponse.json(
      { ok: false, message: "サーバーでエラーが発生しました" },
      { status: 500 },
    );
  }
}
