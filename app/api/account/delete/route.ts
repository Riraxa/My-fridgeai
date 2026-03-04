// app/api/account/delete/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;

    // Re-authentication Check: Ensure session is fresh (< 5 minutes)
    // authTime (from JWT iat) is in seconds
    const now = Math.floor(Date.now() / 1000);
    const authTime = (session as any).authTime as number;
    const authAge = now - (authTime || 0);

    if (!authTime || authAge > 5 * 60) {
      return NextResponse.json(
        { error: "セキュリティのため、再認証が必要です" },
        { status: 403 },
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
