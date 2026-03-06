// app/api/auth/webauthn/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getWebAuthnRP } from "@/lib/webauthnRP";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimiter";
import { validateAndNormalizeIP } from "@/lib/security";

/**
 * POST /api/auth/webauthn/register
 * body: {
 *   email: string
 *   attestationResponse: RegistrationResponseJSON
 * }
 */
export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "unknown";

    // Rate Limit: 1 IP / 5 min / 3 requests
    const rateLimitResult = await rateLimit(ip, "register", 3, 5 * 60);
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

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { ok: false, message: "送信データが不正です" },
        { status: 400 },
      );
    }

    const { email: rawEmail, attestationResponse } = body;
    if (!rawEmail || !attestationResponse) {
      return NextResponse.json(
        { ok: false, message: "メールアドレスまたは認証情報が不足しています" },
        { status: 400 },
      );
    }

    const email = String(rawEmail).toLowerCase().trim();

    // ユーザー取得
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user?.verifyToken) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "登録チャレンジが見つかりません。再度登録をやり直してください",
        },
        { status: 400 },
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

    // Challenge Expiry Check (5 min)
    if (user.verifyTokenCreatedAt) {
      const diff = Date.now() - user.verifyTokenCreatedAt.getTime();
      if (diff > 5 * 60 * 1000) {
        // Expired
        await prisma.user.update({
          where: { id: user.id },
          data: { verifyToken: null, verifyTokenCreatedAt: null },
        });
        return NextResponse.json(
          {
            ok: false,
            message:
              "登録チャレンジの有効期限が切れています。もう一度最初からやり直してください",
          },
          { status: 400 },
        );
      }
    } else {
      // Legacy check: if user implies stricter security, we might reject null
      // For now, allow null but logging might be good.
      // The user prompt said: "3. チャレンジ再利用防止... 有効期限 5 分以内のみ受け入れる"
      // So if null, technically it has no timestamp, so we can't confirm it's fresh.
      // Safer to reject if we want strict security, similar to reusing legacy tokens?
      // But the user said: "verifyTokenCreatedAt は既存ユーザーには null になるので...".
      // -> "verifyTokenCreatedAt is null for existing... is it ok? -> OK".
      // So we act permissive if null.
    }

    const expectedChallenge = user.verifyToken;
    const { origin, rpID } = getWebAuthnRP();

    // ---- WebAuthn 検証 ----
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: attestationResponse,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
    } catch (err: unknown) {
      const error = err as Error;
      console.error("[webauthn][register] verify error:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        expectedOrigin: origin,
        expectedRPID: rpID,
        challengePreview: expectedChallenge?.substring(0, 20) + "...",
      });
      // Detailed error might be too technical, keeping it somewhat generic but clear
      return NextResponse.json(
        { ok: false, message: "認証情報の検証に失敗しました" },
        { status: 400 },
      );
    }

    if (!verification.verified) {
      return NextResponse.json(
        { ok: false, message: "登録が確認できませんでした" },
        { status: 400 },
      );
    }

    const registrationInfo = verification.registrationInfo;
    if (!registrationInfo?.credential) {
      return NextResponse.json(
        { ok: false, message: "登録情報が不足しています" },
        { status: 500 },
      );
    }

    const credential = registrationInfo.credential;

    const credentialIdBase64url = credential.id;

    const publicKeyBase64 = Buffer.from(credential.publicKey).toString(
      "base64",
    );

    const signCount = credential.counter ?? 0;
    const transports = credential.transports ?? [];

    // Get userAgent from headers for auto-naming (reuse headersList from line 18)
    const userAgent = headersList.get("user-agent") ?? undefined;

    // Get optional name from body
    const passkeyName =
      body.name && typeof body.name === "string"
        ? body.name.trim().slice(0, 100)
        : null;

    await prisma.passkey.create({
      data: {
        userId: user.id,
        credentialId: credentialIdBase64url,
        publicKey: publicKeyBase64,
        signCount,
        transports: JSON.stringify(transports),
        name: passkeyName,
        userAgent,
      },
    });

    // challenge は必ず破棄（再利用防止）し、パスキー登録完了フラグを立てる
    // ただし、新端末登録フロー(passkey_setup:)の場合は、次の complete API で検証するため保持する
    const isSetupToken = user.verifyToken?.startsWith("passkey_setup:");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verifyToken: isSetupToken ? user.verifyToken : null,
        verifyTokenCreatedAt: isSetupToken ? user.verifyTokenCreatedAt : null,
        passkeySetupCompleted: true,
        authMethod: "passkey_enabled",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webauthn][register] unexpected:", err);
    return NextResponse.json(
      { ok: false, message: "サーバーでエラーが発生しました" },
      { status: 500 },
    );
  }
}
