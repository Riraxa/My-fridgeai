import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resend, EMAIL_FROM } from "@/lib/mail/resend";
import { rateLimit } from "@/lib/rateLimiter";
import { validateAndNormalizeIP } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    // Identifier for rate limiting: userId or IP
    const ip = validateAndNormalizeIP(req.headers.get("x-forwarded-for"));
    const identifier = session?.user?.id ? `user:${session.user.id}` : `ip:${ip}`;
    const maxRequests = session?.user?.id ? 5 : 3;

    // 1. Rate Limit Check (per hour)
    const limiter = await rateLimit(identifier, "CONTACT_FORM", maxRequests, 3600);
    if (!limiter.ok) {
      return NextResponse.json(
        {
          error: "送信回数の上限を超えました。しばらく待ってから再試行してください。",
        },
        { 
          status: 429,
          headers: { "X-RateLimit-Reset": limiter.resetTime.toString() }
        }
      );
    }

    const body = await req.json();
    const { type, subject, description, userId, userName, userEmail } = body;

    // Validation
    if (!subject || subject.length < 5 || subject.length > 200) {
      return NextResponse.json(
        { error: "件名は5文字以上200文字以内で入力してください" },
        { status: 400 },
      );
    }
    if (!description || description.length < 10 || description.length > 5000) {
      return NextResponse.json(
        { error: "内容は10文字以上5000文字以内で入力してください" },
        { status: 400 },
      );
    }

    // Check email configuration
    if (!process.env.SUPPORT_EMAIL) {
      return NextResponse.json(
        {
          error: "サポート用メールアドレスが設定されていません。",
        },
        { status: 500 },
      );
    }

    // Prepare email content
    const typeLabels = {
      bug: "バグ報告",
      feature: "機能要望",
      other: "その他",
    };

    const emailContent = `
お問い合わせ種別: ${typeLabels[type as keyof typeof typeLabels] || type}
件名: ${subject}

ユーザー情報:
${userId ? `ユーザーID: ${userId}` : "未ログインユーザー"}
${userName ? `氏名: ${userName}` : "未入力"}
${userEmail ? `メールアドレス: ${userEmail}` : "未入力"}

内容:
${description}

送信元IP: ${ip}
送信日時: ${new Date().toLocaleString('ja-JP')}
    `.trim();

    // Send email to support
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: process.env.SUPPORT_EMAIL,
      subject: `[My-fridgeai お問い合わせ] ${typeLabels[type as keyof typeof typeLabels]}: ${subject}`,
      text: emailContent,
      replyTo: userEmail || undefined,
    });

    if (error) {
      console.error("Email send error:", error);
      return NextResponse.json(
        { error: "メールの送信に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { 
        message: "お問い合わせを受け付けました。ありがとうございます。",
        data 
      },
      { status: 200 },
    );

  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
