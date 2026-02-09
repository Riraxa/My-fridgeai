// app/api/auth/add-device/complete/route.ts
/**
 * 新端末登録用 - パスキー登録完了API
 *
 * パスキー登録が成功した後に呼び出される。
 * このタイミングでのみセッションを発行し、ログイン完了扱いにする。
 * また、セキュリティ通知メールを送信する。
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend, EMAIL_FROM } from "@/lib/mail/resend";
import crypto from "crypto";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimiter";

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "unknown";
    const userAgent = headersList.get("user-agent") ?? "Unknown Device";

    // Rate Limit
    const rateLimitResult = await rateLimit(
      ip,
      "add-device-complete",
      5,
      15 * 60,
    );
    if (!rateLimitResult.ok) {
      return NextResponse.json(
        { ok: false, message: "リクエスト回数が多すぎます。" },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { setupToken, email } = body ?? {};

    if (!setupToken || typeof setupToken !== "string") {
      return NextResponse.json(
        { ok: false, message: "無効なリクエストです。" },
        { status: 400 },
      );
    }
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { ok: false, message: "無効なリクエストです。" },
        { status: 400 },
      );
    }

    const emailLower = email.toLowerCase().trim();

    // setupTokenを検証
    // すでに登録済み(passkeySetupCompleted: true)の場合は、トークンがクリアされていても成功扱いにする (UX優先)
    let user = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          message: "ユーザーが見つかりません。",
        },
        { status: 404 },
      );
    }

    const isValidToken = user.verifyToken === `passkey_setup:${setupToken}`;
    const isRecentlyCompleted = user.passkeySetupCompleted;

    if (!isValidToken && !isRecentlyCompleted) {
      return NextResponse.json(
        {
          ok: false,
          message: "セッションが無効です。最初からやり直してください。",
        },
        { status: 401 },
      );
    }

    // パスキーが実際に登録されているか確認
    const passkeyCount = await prisma.passkey.count({
      where: { userId: user.id },
    });

    if (passkeyCount === 0) {
      return NextResponse.json(
        { ok: false, message: "パスキーの登録が完了していません。" },
        { status: 400 },
      );
    }

    // 認証用トークンを生成（NextAuth signInで使用）
    const authToken = crypto.randomBytes(32).toString("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verifyToken: authToken,
        verifyTokenCreatedAt: new Date(),
        passkeySetupCompleted: true,
      },
    });

    // セキュリティ通知メールを送信
    const deviceInfo = parseUserAgent(userAgent);
    const now = new Date();
    const formattedDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email!,
      subject: "【My-fridgeai】新しい端末が登録されました",
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
  <h2 style="color: #333; margin-top: 0;">新しい端末が登録されました</h2>
  <p style="margin-bottom: 16px;">あなたのアカウントに新しい端末が登録されました。</p>
  <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #eee; margin: 20px 0;">
    <p style="margin: 0 0 8px 0;"><strong>日時:</strong> ${formattedDate}</p>
    <p style="margin: 0 0 8px 0;"><strong>端末:</strong> ${deviceInfo}</p>
    <p style="margin: 0;"><strong>IPアドレス:</strong> ${ip.split(",")[0].trim()}</p>
  </div>
  <p style="color: #e74c3c; font-weight: bold; margin-top: 24px;">この操作に心当たりがない場合は、すぐにサポートまでご連絡ください。</p>
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
      token: authToken,
      autoLogin: true,
      email: user.email,
      message: "パスキーの登録が完了しました。",
    });
  } catch (err: any) {
    console.error("[add-device/complete] error:", err);
    return NextResponse.json(
      { ok: false, message: "サーバーでエラーが発生しました。" },
      { status: 500 },
    );
  }
}

function parseUserAgent(ua: string): string {
  // 簡易的なUA解析
  if (ua.includes("iPhone")) return "iPhone";
  if (ua.includes("iPad")) return "iPad";
  if (ua.includes("Android")) return "Android デバイス";
  if (ua.includes("Windows")) return "Windows PC";
  if (ua.includes("Mac")) return "Mac";
  if (ua.includes("Linux")) return "Linux PC";
  return "不明なデバイス";
}
