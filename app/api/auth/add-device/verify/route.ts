// app/api/auth/add-device/verify/route.ts
/**
 * 新端末登録用 - 本人確認API
 *
 * 入力: email, password
 * 条件:
 * 1. email が存在する
 * 2. password が一致する
 * 3. authMethod === "passkey_enabled"
 * 4. emailVerified = true
 * 5. status === "active"
 *
 * 成功時: ワンタイムトークンを生成し、確認メールを送信
 * 失敗時: エラーメッセージを返す（セッションは絶対に発行しない）
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { resend, EMAIL_FROM } from "@/lib/mail/resend";
import { buildPasskeyVerificationEmail } from "@/lib/mail/passkeyTemplates";
import crypto from "crypto";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimiter";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "unknown";

    // Rate Limit: 5リクエスト / 15分
    const rateLimitResult = await rateLimit(
      ip,
      "add-device-verify",
      5,
      15 * 60,
    );
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
    const { email, password } = body ?? {};

    // バリデーション
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { ok: false, message: "メールアドレスを入力してください。" },
        { status: 400 },
      );
    }
    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { ok: false, message: "パスワードを入力してください。" },
        { status: 400 },
      );
    }

    const emailLower = email.toLowerCase().trim();

    // 1. ユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email: emailLower },
      select: {
        id: true,
        email: true,
        password: true,
        status: true,
        emailVerified: true,
        authMethod: true,
      },
    });

    // 1. email が存在しない場合
    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          message: "メールアドレスまたはパスワードが正しくありません。",
        },
        { status: 401 },
      );
    }

    // 2. password 不一致
    if (!user.password) {
      return NextResponse.json(
        {
          ok: false,
          message: "メールアドレスまたはパスワードが正しくありません。",
        },
        { status: 401 },
      );
    }
    const passwordMatch = await compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        {
          ok: false,
          message: "メールアドレスまたはパスワードが正しくありません。",
        },
        { status: 401 },
      );
    }

    // アカウント有効チェック
    if (user.status !== "active") {
      return NextResponse.json(
        { ok: false, message: "このアカウントは無効化されています。" },
        { status: 403 },
      );
    }

    // 3. authMethod !== "passkey_enabled"
    if (user.authMethod !== "passkey_enabled") {
      return NextResponse.json(
        {
          ok: false,
          message: "このアカウントは新端末登録の対象ではありません。",
        },
        { status: 400 },
      );
    }

    // 4. emailVerified = false
    if (!user.emailVerified) {
      return NextResponse.json(
        { ok: false, message: "メール認証が完了していません。" },
        { status: 400 },
      );
    }

    // すべての条件を満たした場合、ワンタイムトークンを生成
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15分後

    // EmailVerificationテーブルを利用してトークンを保存
    // 用途を識別するためにcodeフィールドに"passkey_add"を設定
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        tokenHash,
        code: "passkey_add", // 用途識別
        expiresAt,
        used: false,
      },
    });

    // 確認メールを送信
    const verifyUrl = `${BASE_URL}/auth/passkey/add-device/verify?token=${rawToken}`;
    const { subject, plain, html } = buildPasskeyVerificationEmail(verifyUrl);

    await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email ?? "",
      subject,
      text: plain,
      html,
    });

    return NextResponse.json({
      ok: true,
      message:
        "確認メールを送信しました。メールを確認してパスキー登録を完了してください。",
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[add-device/verify] error:", error);
    return NextResponse.json(
      { ok: false, message: "サーバーでエラーが発生しました。" },
      { status: 500 },
    );
  }
}
