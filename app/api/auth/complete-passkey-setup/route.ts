import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateAndNormalizeIP } from "@/lib/security";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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
      const rawIP = req.headers.get("x-forwarded-for");
      const ip = validateAndNormalizeIP(rawIP);
      if (!user.allowedIps.includes(ip)) {
        return NextResponse.json(
          { error: "許可されていないIPからの操作です" },
          { status: 403 },
        );
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { passkeySetupCompleted: true },
    });

    return NextResponse.json({ ok: true, message: "パスキー登録完了" });
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
