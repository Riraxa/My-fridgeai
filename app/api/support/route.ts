import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resend, EMAIL_FROM } from "@/lib/mail/resend";

export const runtime = "nodejs";

// Simple in-memory rate limit: per user/IP, list of timestamps
const rateLimitMap = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    // Identifier for rate limiting: userId or IP
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const identifier = session?.user?.id ? `user:${session.user.id}` : `ip:${ip}`;

    // Rate Limit Check (5 requests per hour)
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    const timestamps = rateLimitMap.get(identifier) || [];
    const recent = timestamps.filter((t) => now - t < windowMs);

    if (recent.length >= 5) {
      return NextResponse.json(
        {
          error:
            "送信回数の上限を超えました。しばらく待ってから再試行してください。",
        },
        { status: 429 },
      );
    }

    // Update rate limit
    recent.push(now);
    rateLimitMap.set(identifier, recent);

    const body = await req.json();
    const { type, subject, description, screenshotBase64 } = body;

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

    // Send Email via Resend
    const { error: sendError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: process.env.SUPPORT_EMAIL,
      subject: `[Support/${type}] ${subject}`,
      text: `🎫 サポートチケット受付
=====================================
送信日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
ユーザー: ${session?.user?.email || "Guest"}
ユーザーID: ${session?.user?.id || "N/A"}
IPアドレス: ${ip}
問い合わせ種別: ${type}

📝 件名
-------------------------------------
${subject}

💬 内容
-------------------------------------
${description}

🔍 システム情報
-------------------------------------
User-Agent: ${req.headers.get("user-agent") || "Unknown"}
Referer: ${req.headers.get("referer") || "None"}

---
このメールは My-fridgeai サポートシステムから Resend を通じて自動送信されました。
`,
      attachments: screenshotBase64
        ? [
          {
            filename: "screenshot.png",
            content: screenshotBase64.split("base64,")[1],
          },
        ]
        : [],
    });

    if (sendError) {
      console.error("resend support email error:", sendError);
      throw new Error("メールの送信に失敗しました");
    }

    console.info("support ticket created", { userId: session?.user?.id, ip, type });

    return NextResponse.json({
      ok: true,
      message: "送信しました。ご協力ありがとうございます。",
    });
  } catch (error: any) {
    console.error("support api error:", error);

    // Handle specific email connection errors
    if (error.code === "ESOCKET" || error.message.includes("ECONNREFUSED")) {
      return NextResponse.json(
        {
          error:
            "メールサーバーに接続できません。管理者にお問い合わせください。",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
