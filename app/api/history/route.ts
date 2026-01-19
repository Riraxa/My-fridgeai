//app/api/history/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Verify path
import { prisma } from "@/lib/prisma";

/**
 * GET: Fetch cooking history for the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
