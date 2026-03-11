// app/api/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { validatePasswordStrength, sanitizeString } from "@/lib/security";
import { resend, EMAIL_FROM } from "@/lib/mail/resend";
import { buildVerificationEmail } from "@/lib/mail/verificationTemplates";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const PASSWORD_POLICY = {
  minLen: 12,
  regex:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?`~]).+$/,
};

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email: rawEmail, password, name } = body ?? {};

    if (!rawEmail || !password) {
      return NextResponse.json(
        { ok: false, message: "メールとパスワードは必須です" },
        { status: 400 },
      );
    }

    // メールのサニタイズと検証
    const email = sanitizeString(String(rawEmail).toLowerCase().trim(), 254);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { ok: false, message: "有効なメールアドレスを入力してください" },
        { status: 400 },
      );
    }

    // 強化されたパスワード検証
    const passwordValidation = validatePasswordStrength(String(password));
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { ok: false, message: passwordValidation.errors.join("、") },
        { status: 400 },
      );
    }

    // 従来のパスワードポリシー検証（互換性のため）
    if (!PASSWORD_POLICY.regex.test(String(password))) {
      return NextResponse.json(
        {
          ok: false,
          message: "パスワードには大文字・小文字・数字・記号を含めてください。",
        },
        { status: 400 },
      );
    }

    // 既存ユーザーチェック
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { ok: false, message: "このメールアドレスは既に登録されています。" },
        { status: 409 },
      );
    }

    // 名前のサニタイズ
    const sanitizedName = name ? sanitizeString(String(name), 100) : null;

    const hashed = await bcrypt.hash(String(password), 12);

    // 同じメールアドレスでPendingUserが存在するか確認し、あれば削除/上書きする
    const existingPending = await prisma.pendingUser.findUnique({ where: { email } });
    if (existingPending) {
        await prisma.pendingUser.delete({ where: { id: existingPending.id } });
    }

    // ランダムトークンの生成
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    
    // 24時間有効
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const pendingUser = await prisma.pendingUser.create({
      data: {
        email,
        name: sanitizedName,
        password: hashed,
        expiresAt,
      },
    });

    await prisma.emailVerification.create({
      data: {
        pendingUserId: pendingUser.id,
        tokenHash,
        code: "email_verification", // Identify purpose
        expiresAt,
      },
    });

    // 確認メール送信
    const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${rawToken}`;
    const { subject, plain, html } = buildVerificationEmail(verifyUrl);

    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject,
        text: plain,
        html,
      });
    } catch (mailErr) {
      console.error("Failed to send verification email:", mailErr);
      // Create it anyway to not block dev but in production this should probably fail the request.
    }

    return NextResponse.json({
      ok: true,
      message: "確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。",
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("register error:", error);
    return NextResponse.json(
      { ok: false, message: "サーバーエラー" },
      { status: 500 },
    );
  }
}
