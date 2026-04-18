// GENERATED_BY_AI: 2026-04-05 味の嗜好再訪トリガーAPI
/**
 * GET /api/taste/pending-feedback
 * アプリ再訪時に表示する未評価の献立を取得
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const daysBack = parseInt(searchParams.get("days") ?? "3"); // デフォルト3日前まで

    // 期間の計算
    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    
    const until = new Date();
    until.setDate(until.getDate() - 1); // 昨日まで

    // 指定期間内のMenuGenerationを取得
    const pendingMenus = await prisma.menuGeneration.findMany({
      where: {
        userId,
        generatedAt: {
          gte: since,
          lte: until,
        },
      },
      orderBy: {
        generatedAt: "desc",
      },
      take: 5,
      include: {
        tasteEvents: {
          where: {
            userId,
            source: { in: ["revisit", "feedback", "swipe"] },
          },
          select: { id: true },
        },
      },
    });

    // 未評価のものだけをフィルタ
    const unevaluatedMenus = pendingMenus.filter((menu: { tasteEvents?: unknown[] }) => (menu.tasteEvents?.length ?? 0) === 0);

    // 選択された献立情報を整形
    const menus = unevaluatedMenus.map((menu: { id: string; selectedMenu?: string | null; mainMenu: unknown; alternativeA: unknown; generatedAt: Date; tasteEvents?: unknown[] }) => {
      const selected = menu.selectedMenu ?? "main";
      const selectedData = selected === "main"
        ? (menu.mainMenu as Record<string, unknown>)
        : (menu.alternativeA as Record<string, unknown>);

      return {
        menuGenerationId: menu.id,
        dishName: selectedData?.name ?? "不明な献立",
        selectedAt: menu.generatedAt,
        daysAgo: Math.floor((Date.now() - menu.generatedAt.getTime()) / (1000 * 60 * 60 * 24)),
      };
    });

    return NextResponse.json({
      hasPendingFeedback: menus.length > 0,
      menus,
      totalCount: menus.length,
    });
  } catch (error) {
    console.error("[PendingFeedback] Error:", error);
    return NextResponse.json(
      { error: "未評価献立の取得に失敗しました" },
      { status: 500 }
    );
  }
}
