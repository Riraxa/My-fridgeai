// app/api/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validatePasswordStrength, sanitizeString } from "@/lib/security";

const PASSWORD_POLICY = {
  minLen: 12,
  regex:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?`~]).+$/,
};

function validatePassword(pw: string) {
  if (typeof pw !== "string") return "パスワードの形式が不正です。";
  if (pw.length < PASSWORD_POLICY.minLen)
    return `パスワードは${PASSWORD_POLICY.minLen}文字以上にしてください。`;
  if (!PASSWORD_POLICY.regex.test(pw))
    return "パスワードには大文字・小文字・数字・記号を含めてください。";
  return null;
}

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
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { ok: false, message: "このメールアドレスは既に登録されています。" },
        { status: 409 },
      );
    }

    // 名前のサニタイズ
    const sanitizedName = name ? sanitizeString(String(name), 100) : null;

    const hashed = await bcrypt.hash(String(password), 12);

    const user = await prisma.user.create({
      data: {
        email,
        name: sanitizedName,
        password: hashed,
        status: "active",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "登録が完了しました。ログインしてください。",
    });
  } catch (err: any) {
    console.error("register error:", err);
    return NextResponse.json(
      { ok: false, message: "サーバーエラー" },
      { status: 500 },
    );
  }
}
