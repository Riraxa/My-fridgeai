// app/api/menu/status/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    const generation = await prisma.menuGeneration.findUnique({
      where: {
        id: id,
        userId: userId, // セキュリティ：自分の生成のみアクセス可能
      },
      select: {
        id: true,
        status: true,
        generatedAt: true,
        mainMenu: true,
        alternativeA: true,
        alternativeB: true,
        nutritionInfo: true,
        usedIngredients: true,
        shoppingList: true,
      },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      status: generation.status,
      data:
        generation.status === "completed"
          ? {
              menuGenerationId: generation.id,
              menus: {
                main: generation.mainMenu,
                alternativeA: generation.alternativeA,
                alternativeB: generation.alternativeB,
              },
              usedIngredients: generation.usedIngredients,
              shoppingList: generation.shoppingList,
              nutrition: generation.nutritionInfo,
            }
          : null,
    });
  } catch (error: any) {
    console.error("Status Check Error:", error);
    return NextResponse.json(
      { error: "ステータス確認に失敗しました" },
      { status: 500 },
    );
  }
}
