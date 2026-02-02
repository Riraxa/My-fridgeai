// app/api/auth/password-reset/request/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend, EMAIL_FROM } from "@/lib/mail/resend";
import crypto from "crypto";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.VERCEL_URL ||
  "http://localhost:3000";

function makeToken() {
  // 32 bytes -> hex (64 chars)
  return crypto.randomBytes(32).toString("hex");
}
function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const emailRaw = body?.email;
    if (!emailRaw || typeof emailRaw !== "string") {
      return NextResponse.json(
        { ok: false, message: "メールアドレスは必須です" },
        { status: 400 },
      );
    }
    const email = emailRaw.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email } });

    // Security: always respond the same to avoid user enumeration.
    // If user exists, create token & send mail. If not, still return ok (but do not create DB record).
    if (!user) {
      // small delay to reduce timing attacks
      await new Promise((r) => setTimeout(r, 300));
      return NextResponse.json({
        ok: true,
        message: "確認メールを送信しました。メールをご確認ください。",
        info: "If account exists",
      });
    }

    // generate token
    const token = makeToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // invalidate existing tokens before creating new one
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // persist token
    await prisma.passwordReset.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        tokenHash,
        expiresAt,
        used: false,
      },
    });

    const resetUrl = `${BASE_URL.replace(/\/$/, "")}/reset-password/confirm?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [email],
      subject: `${process.env.NEXT_PUBLIC_APP_NAME ?? "My-fridgeai"} — パスワード再設定`,
      text: `パスワード再設定リクエストを受け付けました。\n\n以下のリンクから新しいパスワードを設定してください（有効期限: 1時間）：\n\n${resetUrl}\n\nもし身に覚えがない場合は本メールを破棄してください。`,
      html: `<p>パスワード再設定リクエストを受け付けました。</p>
             <p>以下のリンクから新しいパスワードを設定してください（有効期限: 1時間）：</p>
             <p><a href="${resetUrl}">${resetUrl}</a></p>
             <p>もし身に覚えがない場合は本メールを破棄してください。</p>`,
    });

    if (error) {
      console.error("[password-reset] send failed:", String(error));
      throw error;
    }

    return NextResponse.json({
      ok: true,
      message: "確認メールを送信しました。メールをご確認ください。",
    });
  } catch (err: any) {
    console.error("[password-reset request] error:", err?.stack ?? err);
    return NextResponse.json(
      {
        ok: false,
        message: "メール送信に失敗しました。設定を確認してください。",
      },
      { status: 500 },
    );
  }
}
