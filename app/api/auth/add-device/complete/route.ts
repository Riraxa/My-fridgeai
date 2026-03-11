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
import { buildPasskeyCompletionEmail } from "@/lib/mail/passkeyTemplates";
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

    const challenge = await prisma.authChallenge.findFirst({
      where: {
        userId: user.id,
        challenge: `passkey_setup:${setupToken}`,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    const isValidToken = !!challenge;
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

    // チャレンジを使用済みにマーク
    if (challenge) {
      await prisma.authChallenge.update({
        where: { id: challenge.id },
        data: { used: true },
      });
    }

    // 認証用トークンを生成（NextAuth signInで使用）
    const authToken = crypto.randomBytes(32).toString("hex");

    await prisma.authChallenge.create({
      data: {
        userId: user.id,
        challenge: `auto_login:${authToken}`,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passkeySetupCompleted: true,
      },
    });

    // セキュリティ通知メールを送信
    const deviceInfo = parseUserAgent(userAgent);
    const now = new Date();
    const formattedDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const ipAddress = (ip.split(",")[0] ?? "unknown").trim();
    
    const { subject, plain, html } = buildPasskeyCompletionEmail(deviceInfo, formattedDate, ipAddress);

    await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email ?? "",
      subject,
      text: plain,
      html,
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
