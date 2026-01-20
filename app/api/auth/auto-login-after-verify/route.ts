//app/api/auth/auto-login-after-verify/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sign } from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // ユーザー検索
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || user.status !== "active" || !user.emailVerified) {
      return NextResponse.json(
        { error: "User not found or not verified" },
        { status: 404 },
      );
    }

    // 一時的なトークンを生成して自動ログイン
    const tempToken = sign(
      {
        userId: user.id,
        email: user.email,
        type: "auto-login-after-verify",
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: "5m" },
    );

    // NextAuthのCredentialsProviderで認証
    const response = NextResponse.json({ ok: true });

    // セッションクッキーを設定
    const sessionToken = sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30日
      },
      process.env.NEXTAUTH_SECRET!,
    );

    const cookieName =
      process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";

    const isProd = process.env.NODE_ENV === "production";

    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      sameSite: isProd ? "strict" : "lax",
      path: "/",
      secure: isProd,
      maxAge: 30 * 24 * 60 * 60, // 30日
    });

    console.log("[auto-login-after-verify] Success:", {
      userId: user.id,
      email: user.email,
    });

    return response;
  } catch (error) {
    console.error("[auto-login-after-verify] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
