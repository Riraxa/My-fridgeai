// app/api/auth/add-device/confirm/route.ts
/**
 * 新端末登録用 - トークン検証API
 *
 * メールリンクから遷移時にトークンを検証する。
 * 成功時: パスキー登録用の一時セッションを発行（限定的なスコープ）
 * 失敗時: エラーを返す
 *
 * 重要: このAPIはセッションを発行しない。
 * 代わりにパスキー登録専用の一時トークンを返す。
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimiter";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "unknown";

    // Rate Limit
    const rateLimitResult = await rateLimit(
      ip,
      "add-device-confirm",
      10,
      15 * 60,
    );
    if (!rateLimitResult.ok) {
      return NextResponse.json(
        { ok: false, message: "リクエスト回数が多すぎます。" },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { token } = body ?? {};

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { ok: false, message: "無効なリクエストです。" },
        { status: 400 },
      );
    }

    const tokenHash = hashToken(token);

    // トークンを検索（passkey_add用）
    const verification = await prisma.emailVerification.findFirst({
      where: {
        tokenHash,
        code: "passkey_add",
        used: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!verification || !verification.user) {
      return NextResponse.json(
        {
          ok: false,
          message: "リンクが無効または期限切れです。再度登録を行ってください。",
        },
        { status: 400 },
      );
    }

    // トークンを使用済みにマーク
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { used: true },
    });

    // パスキー登録専用の一時トークンを生成
    // これはパスキー登録完了時にのみセッションを発行するために使用
    const passkeySetupToken = crypto.randomBytes(32).toString("hex");

    // AuthChallengeに登録用の一時トークンを保存（5分間有効）
    await prisma.authChallenge.create({
      data: {
        userId: verification.user.id,
        challenge: `passkey_setup:${passkeySetupToken}`,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5分間有効
      },
    });

    return NextResponse.json({
      ok: true,
      email: verification.user.email,
      setupToken: passkeySetupToken,
    });
  } catch (err: any) {
    console.error("[add-device/confirm] error:", err);
    return NextResponse.json(
      { ok: false, message: "サーバーでエラーが発生しました。" },
      { status: 500 },
    );
  }
}
