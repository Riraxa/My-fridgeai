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

    await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email!,
      subject: "【My-fridgeai】新しい端末でのパスキー登録確認",
      html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
  <h1 style="color: white; margin: 0; font-size: 24px;">My-fridgeai</h1>
</div>
<div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px;">
  <p style="margin-bottom: 16px;">My-fridgeai をご利用いただきありがとうございます。</p>
  <p style="margin-bottom: 16px;">新しい端末から、あなたのアカウントにパスキーを追加登録しようとしています。</p>
  <p style="margin-bottom: 24px;">以下のボタンをクリックして、パスキーの登録を完了してください。</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${verifyUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">パスキー登録を続行する</a>
  </div>
  <p style="color: #666; font-size: 14px; margin-top: 24px;">※このリンクの有効期限は15分です。</p>
  <p style="color: #666; font-size: 14px;">※この操作に心当たりがない場合は、本メールを破棄してください。</p>
</div>
<div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
  © My-fridgeai
</div>
</body>
</html>
      `.trim(),
    });

    return NextResponse.json({
      ok: true,
      message:
        "確認メールを送信しました。メールを確認してパスキー登録を完了してください。",
    });
  } catch (err: any) {
    console.error("[add-device/verify] error:", err);
    return NextResponse.json(
      { ok: false, message: "サーバーでエラーが発生しました。" },
      { status: 500 },
    );
  }
}
