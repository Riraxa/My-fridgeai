import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Helper to check if user is Pro
async function isProUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  return user?.plan === "PRO";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const generation = await prisma.menuGeneration.findUnique({
      where: {
        id: id,
        userId: userId, // セキュリティ：自分の生成のみアクセス可能
      },
      select: {
        id: true,
        status: true,
        progressStep: true,
        generatedAt: true,
        mainMenu: true,
        alternativeA: true,
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

    // 2分以上経過して進行中の場合は失敗（ゴースト生成）として扱う
    const generationDate = new Date(generation.generatedAt).getTime();
    const isStale = (generation.status === "processing" || generation.status === "pending") && 
                    (Date.now() - generationDate > 120000);

    if (isStale) {
      await prisma.menuGeneration.update({
        where: { id: id },
        data: { status: "failed", progressStep: "failed" },
      });
      return NextResponse.json({
        success: true,
        status: "failed",
        progressStep: "failed",
        error: "生成がタイムアウトしました。サーバーの再起動等で処理が中断された可能性があります。もう一度お試しください。"
      });
    }

    // Check Pro status
    const isPro = await isProUser(userId);

    // Prepare response data
    let responseData: any = null;
    if (generation.status === "completed") {
      // Clone nutritionInfo to avoid mutating original
      const nutritionData = JSON.parse(JSON.stringify(generation.nutritionInfo));

      // Mask costEfficiency for non-Pro users
      if (nutritionData?.scores && !isPro) {
        nutritionData.scores.main.costEfficiency = undefined;
        nutritionData.scores.altA.costEfficiency = undefined;
      }

      responseData = {
        menuGenerationId: generation.id,
        menus: {
          main: generation.mainMenu,
          alternativeA: generation.alternativeA,
        },
        availability: {
          main: reconstructAvailability(
            (generation.usedIngredients as any)?.main,
            (generation.shoppingList as any)?.main,
          ),
          altA: reconstructAvailability(
            (generation.usedIngredients as any)?.altA,
            (generation.shoppingList as any)?.altA,
          ),
        },
        usedIngredients: generation.usedIngredients,
        shoppingList: generation.shoppingList,
        nutrition: nutritionData,
      };
    }

    return NextResponse.json({
      success: true,
      status: generation.status,
      progressStep: generation.progressStep,
      data: responseData,
    });
  } catch (error: any) {
    console.error("Status Check Error:", error);
    return NextResponse.json(
      { error: "ステータス確認に失敗しました" },
      { status: 500 },
    );
  }
}

// Helper to reconstruct availability object
function reconstructAvailability(used: any[], shopping: any[]) {
  const available = Array.isArray(used) ? used : [];
  const shoppingList = Array.isArray(shopping) ? shopping : [];

  const insufficient = shoppingList.filter(
    (i: any) => i.status === "insufficient",
  );
  const missing = shoppingList.filter((i: any) => i.status === "missing");

  return {
    available,
    insufficient,
    missing,
  };
}
