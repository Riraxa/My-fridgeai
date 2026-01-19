// app/api/menu/generate-async/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateMenus } from "@/lib/ai/menu-generator";
import { checkIngredientAvailability } from "@/lib/inventory";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in session" },
        { status: 401 },
      );
    }

    // 1. Check User Plan & Rate Limits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    const isPro = user?.plan === "PRO";
    const limit = isPro ? 10 : 2;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await prisma.menuGeneration.count({
      where: {
        userId: userId,
        generatedAt: { gte: today },
      },
    });

    if (count >= limit) {
      return NextResponse.json(
        { error: "1日の生成回数制限に達しました" },
        { status: 429 },
      );
    }

    // 2. Fetch Inventory & Preferences
    const [ingredients, preferences] = await Promise.all([
      prisma.ingredient.findMany({ where: { userId: userId } }),
      prisma.userPreferences.findUnique({ where: { userId: userId } }),
    ]);

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { error: "冷蔵庫に食材がありません。先に食材を追加してください。" },
        { status: 400 },
      );
    }

    // 3. Create pending generation record
    const generation = await prisma.menuGeneration.create({
      data: {
        userId: userId,
        status: "pending",
        mainMenu: {} as any,
        alternativeA: {} as any,
        alternativeB: {} as any,
        nutritionInfo: {} as any,
        usedIngredients: {} as any,
        shoppingList: {} as any,
      },
    });

    // 4. Start background processing (don't await)
    processMenuGeneration(
      generation.id,
      userId,
      ingredients,
      preferences || undefined,
    ).catch((error) => {
      console.error("Background processing failed:", error);
      // Update status to failed
      prisma.menuGeneration
        .update({
          where: { id: generation.id },
          data: { status: "failed" },
        })
        .catch(console.error);
    });

    return NextResponse.json({
      success: true,
      menuGenerationId: generation.id,
      message: "献立生成を開始しました",
    });
  } catch (error: any) {
    console.error("Async Menu Generation Error:", error);
    return NextResponse.json(
      {
        error: "献立生成の開始に失敗しました",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function processMenuGeneration(
  generationId: string,
  userId: string,
  ingredients: any[],
  preferences: any,
) {
  try {
    // Update status to processing
    await prisma.menuGeneration.update({
      where: { id: generationId },
      data: { status: "processing" },
    });

    // Detect Expiring Items
    const now = new Date();
    const expiringSoon = ingredients.filter((i) => {
      if (!i.expirationDate) return false;
      const diff = i.expirationDate.getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days <= 3;
    });

    // Generate Menus via AI
    const menus = await generateMenus(ingredients, preferences, expiringSoon);
    if (!menus || !menus.main) {
      throw new Error("AIが有効な献立を生成できませんでした");
    }

    // Check Availability for ALL Menus
    const mainDetails = checkIngredientAvailability(
      (menus.main.dishes || []).flatMap((d: any) => d.ingredients || []),
      ingredients,
    );

    const altADetails = menus.alternativeA
      ? checkIngredientAvailability(
          (menus.alternativeA.dishes || []).flatMap(
            (d: any) => d.ingredients || [],
          ),
          ingredients,
        )
      : mainDetails;

    const altBDetails = menus.alternativeB
      ? checkIngredientAvailability(
          (menus.alternativeB.dishes || []).flatMap(
            (d: any) => d.ingredients || [],
          ),
          ingredients,
        )
      : mainDetails;

    // Calculate Nutrition
    let nutritionInfo = {
      main: { total: { calories: 0, protein: 0, fat: 0, carbs: 0 } },
      altA: { total: { calories: 0, protein: 0, fat: 0, carbs: 0 } },
      altB: { total: { calories: 0, protein: 0, fat: 0, carbs: 0 } },
    };

    try {
      const { evaluateNutrition } = await import("@/lib/nutrition");
      nutritionInfo = {
        main: evaluateNutrition(menus.main.dishes || []),
        altA: evaluateNutrition(menus.alternativeA?.dishes || []),
        altB: evaluateNutrition(menus.alternativeB?.dishes || []),
      } as any;
    } catch (e) {
      console.warn("Nutrition calculation failed:", e);
    }

    // Update with completed data
    await prisma.menuGeneration.update({
      where: { id: generationId },
      data: {
        status: "completed",
        mainMenu: menus.main as any,
        alternativeA: menus.alternativeA as any,
        alternativeB: menus.alternativeB as any,
        nutritionInfo: nutritionInfo as any,
        usedIngredients: {
          main: mainDetails.available,
          altA: altADetails.available,
          altB: altBDetails.available,
        } as any,
        shoppingList: {
          main: mainDetails.missing.concat(mainDetails.insufficient),
          altA: altADetails.missing.concat(altADetails.insufficient),
          altB: altBDetails.missing.concat(altBDetails.insufficient),
        } as any,
      },
    });
  } catch (error: any) {
    console.error("Background processing error:", error);
    await prisma.menuGeneration.update({
      where: { id: generationId },
      data: { status: "failed" },
    });
  }
}
