// app/api/auth/webauthn/authenticate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Passkey } from "@prisma/client";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { getWebAuthnRP } from "@/lib/webauthnRP";
import crypto from "crypto";
import { cookies } from "next/headers";

/** helpers */
function base64urlToBase64(s: string) {
  let out = s.replace(/-/g, "+").replace(/_/g, "/");
  while (out.length % 4 !== 0) out += "=";
  return out;
}
function base64ToBase64url(s: string) {
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function normalizeBase64url(input: string | ArrayBuffer | Uint8Array) {
  if (typeof input === "string") {
    // if contains + or / treat as raw base64 and convert
    if (input.includes("+") || input.includes("/")) {
      // base64 -> base64url
      return base64ToBase64url(input);
    }
    // convert to canonical base64url no padding
    return input.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  // ArrayBuffer/Uint8Array -> base64url
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input as any);
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function base64urlToBuffer(s: string) {
  const b64 = base64urlToBase64(s);
  return Buffer.from(b64, "base64");
}
function parsePublicKeyFromStored(stored: string) {
  // stored could be base64 (standard) or base64url; detect and convert to Buffer
  if (stored.includes("-") || stored.includes("_")) {
    const b64 = base64urlToBase64(stored);
    return Buffer.from(b64, "base64");
  } else {
    return Buffer.from(stored, "base64");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email: rawEmail, assertionResponse } = body ?? {};

    // Basic validation
    if (!assertionResponse) {
      return NextResponse.json(
        { ok: false, message: "認証情報が不正です（Assertion欠落）" },
        { status: 400 },
      );
    }
    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { ok: false, message: "メールアドレスが必要です。" },
        { status: 400 },
      );
    }

    const email = rawEmail.toLowerCase().trim();

    // 1. Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "そのメールアドレスは未登録です。" },
        { status: 404 },
      );
    }

    // 2. IP Restriction Check
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (user.allowedIps && user.allowedIps.length > 0) {
      if (!user.allowedIps.includes(ip)) {
        console.warn(
          `[webauthn] blocked login attempt from unauthorized IP: ${ip} for user: ${email}`,
        );
        return NextResponse.json(
          {
            ok: false,
            message: "このIPアドレスからのアクセスは許可されていません。",
          },
          { status: 403 },
        );
      }
    }

    // 3. Challenge Verification
    if (!user.verifyToken) {
      console.warn("[webauthn] no challenge stored on user", user.id);
      return NextResponse.json(
        {
          ok: false,
          message: "認証チャレンジが見つかりません。再度お試しください。",
        },
        { status: 400 },
      );
    }
    if (user.verifyExpires && new Date() > new Date(user.verifyExpires)) {
      console.warn("[webauthn] challenge expired for user", user.id);
      return NextResponse.json(
        {
          ok: false,
          message: "認証チャレンジが期限切れです。再度お試しください。",
        },
        { status: 400 },
      );
    }
    const expectedChallenge = normalizeBase64url(user.verifyToken);

    // 4. Find Passkey
    const assertionIdRaw = (assertionResponse as any).id;
    if (!assertionIdRaw) {
      return NextResponse.json(
        { ok: false, message: "認証情報が不正です" },
        { status: 400 },
      );
    }
    const assertionIdBase64url =
      typeof assertionIdRaw === "string"
        ? normalizeBase64url(assertionIdRaw)
        : normalizeBase64url(
            Buffer.from(assertionIdRaw as ArrayBuffer).toString("base64"),
          );

    const passkeys = await prisma.passkey.findMany({
      where: { userId: user.id },
    });
    const pk =
      passkeys.find((p) => {
        try {
          const dbId = normalizeBase64url(p.credentialId);
          return dbId === assertionIdBase64url;
        } catch {
          return false;
        }
      }) ?? null;

    if (!pk) {
      console.warn(
        "[webauthn] unknown credential for user",
        user.id,
        assertionIdBase64url,
      );
      return NextResponse.json(
        {
          ok: false,
          message: "このアカウントに紐づくパスキーが見つかりません。",
        },
        { status: 400 },
      );
    }

    // 5. Verify Signature
    const { origin, rpID } = getWebAuthnRP();

    const credential = {
      id: pk.credentialId,
      publicKey: parsePublicKeyFromStored(pk.publicKey),
      counter: Number(pk.signCount ?? 0),
    };

    const respAny = assertionResponse as any;
    const responseForVerify: any = {
      authenticatorData: respAny.response?.authenticatorData
        ? base64urlToBuffer(
            normalizeBase64url(respAny.response.authenticatorData),
          )
        : undefined,
      clientDataJSON: respAny.response?.clientDataJSON
        ? base64urlToBuffer(normalizeBase64url(respAny.response.clientDataJSON))
        : undefined,
      signature: respAny.response?.signature
        ? base64urlToBuffer(normalizeBase64url(respAny.response.signature))
        : undefined,
      userHandle:
        respAny.response?.userHandle && respAny.response?.userHandle !== "null"
          ? base64urlToBuffer(normalizeBase64url(respAny.response.userHandle))
          : null,
    };

    const authResponsePayload: any = {
      id: respAny.id,
      rawId: respAny.rawId
        ? base64urlToBuffer(normalizeBase64url(respAny.rawId))
        : base64urlToBuffer(assertionIdBase64url),
      response: responseForVerify,
      type: respAny.type ?? "public-key",
    };

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: authResponsePayload,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential,
      } as any);
    } catch (e: any) {
      console.error(
        "[webauthn authenticate] verifyAuthenticationResponse threw:",
        e,
      );
      return NextResponse.json(
        { ok: false, message: "認証の検証に失敗しました。" },
        { status: 400 },
      );
    }

    if (!verification || !verification.verified) {
      console.warn("[webauthn] verification failed:", verification);
      return NextResponse.json(
        { ok: false, message: "認証に失敗しました。" },
        { status: 400 },
      );
    }

    // 6. Success -> Update sign count
    const newCounter = Number(
      (verification.authenticationInfo &&
        verification.authenticationInfo.newCounter) ??
        pk.signCount ??
        0,
    );
    await prisma.passkey.update({
      where: { id: pk.id },
      data: { signCount: newCounter },
    });

    // 7. Cleanup challenge & Issue One-Time Token
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { verifyToken: null, verifyExpires: null },
      });
    } catch (e) {
      console.warn("[webauthn] failed to clear user.verifyToken:", e);
    }

    const oneTime = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verifyCode: oneTime,
        verifyExpires: expiresAt,
        verifyToken: null,
      },
    });

    return NextResponse.json({ ok: true, token: oneTime }, { status: 200 });
  } catch (err: any) {
    console.error("[webauthn authenticate] unexpected error:", err);
    return NextResponse.json(
      { ok: false, message: "サーバーエラーが発生しました。" },
      { status: 500 },
    );
  }
}
