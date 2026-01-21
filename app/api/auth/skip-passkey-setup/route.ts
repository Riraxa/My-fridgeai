import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: "next-auth.session-token", // 明示的にクッキー名を指定
    });

    console.log("[SKIP-PASSKEY] Token check:", {
      hasToken: !!token,
      tokenSub: token?.sub,
      tokenEmail: token?.email,
      timestamp: new Date().toISOString(),
    });

    if (!token?.sub) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: token.sub },
    });

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 },
      );
    }

    await prisma.user.update({
      where: { id: token.sub },
      data: { passkeySetupCompleted: true },
    });

    return NextResponse.json({
      ok: true,
      message: "パスキー登録をスキップしました",
    });
  } catch (error) {
    console.error("skip-passkey-setup error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
