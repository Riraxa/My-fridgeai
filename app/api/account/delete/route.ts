// app/api/account/delete/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.sub) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = token.sub;

    // Re-authentication Check: Ensure session is fresh (< 5 minutes)
    // token.iat is in seconds
    const now = Math.floor(Date.now() / 1000);
    const authAge = now - (token?.iat as number);
    if (authAge > 5 * 60) {
      return NextResponse.json(
        { error: "セキュリティのため、再認証が必要です" },
        { status: 403 }, // 403 signals re-auth needed often, or 401? Spec said "4xx"
      );
    }

    // ユーザーの存在を確認してから削除
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 },
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("delete account error:", err);
    return NextResponse.json(
      { error: "アカウント削除に失敗しました" },
      { status: 500 },
    );
  }
}
