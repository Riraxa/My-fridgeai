import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    console.log("[SKIP-PASSKEY] Session check:", {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      timestamp: new Date().toISOString(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 },
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
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
