import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });

    if (!token?.sub) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: token.sub },
      select: {
        id: true,
        allowedIps: true,
        status: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 },
      );
    }

    if (user.status !== "active") {
      return NextResponse.json(
        { error: "アカウントが有効ではありません" },
        { status: 403 },
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "メール認証が完了していません" },
        { status: 403 },
      );
    }

    // IP Check
    if (user.allowedIps && user.allowedIps.length > 0) {
      const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
      if (!user.allowedIps.includes(ip)) {
        return NextResponse.json(
          { error: "許可されていないIPからの操作です" },
          { status: 403 },
        );
      }
    }

    await prisma.user.update({
      where: { id: token.sub },
      data: { passkeySetupCompleted: true },
    });

    return NextResponse.json({ ok: true, message: "パスキー登録完了" });
  } catch (error) {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
