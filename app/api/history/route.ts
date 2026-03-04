//app/api/history/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const userId = session.user.id;

    const history = await prisma.cookingHistory.findMany({
      where: { userId },
      include: {
        menuGeneration: {
          select: {
            mainMenu: true,
            alternativeA: true,
            alternativeB: true,
            selectedMenu: true,
          },
        },
      },
      orderBy: { cookedAt: "desc" },
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Cooking History GET Error:", error);
    return NextResponse.json(
      { error: "履歴の取得に失敗しました" },
      { status: 500 },
    );
  }
}
