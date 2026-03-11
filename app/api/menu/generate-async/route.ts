// GENERATED_BY_AI: 2026-03-11 antigravity
// app/api/menu/generate-async/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateMenus } from "@/lib/ai/menu-generator";
import { checkIngredientAvailability } from "@/lib/inventory";
import { AI_LIMIT_FREE, AI_LIMIT_PRO } from "@/lib/aiLimit";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
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
    const limit = isPro ? AI_LIMIT_PRO : AI_LIMIT_FREE;

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

    // 2. Fetch Inventory
    const ingredients = await prisma.ingredient.findMany({
      where: { userId: userId },
    });

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { error: "冷蔵庫に食材がありません。先に食材を追加してください。" },
        { status: 400 },
      );
    }

    // 3. Parse & Validate Options
    const body = await req.json().catch(() => ({}));
    let { servings, budget } = body;

    // Default servings to 1 if invalid
    if (!servings || typeof servings !== "number" || servings < 1) {
      servings = 1;
    }

    // Free Plan Limit: Max 3 servings, No Budget allowed
    if (!isPro) {
      if (servings > 3) {
        return NextResponse.json(
          {
            error:
              "Freeプランでは最大3人前までです。Proプランにアップグレードすると最大8人前まで指定できます。",
          },
          { status: 403 },
        );
      }
      budget = null;
    } else {
      if (servings > 8) {
        return NextResponse.json(
          { error: "一度に生成できるのは最大8人前までです。" },
          { status: 400 },
        );
      }
      if (budget !== undefined && budget !== null) {
        if (typeof budget !== "number" || budget < 1) {
          return NextResponse.json(
            { error: "予算は1以上の数値を指定してください。" },
            { status: 400 },
          );
        }
      } else {
        budget = null;
      }
    }

    // 3.5. Hash calculation for caching (Async)
    const crypto = await import("crypto");
    const sortedIngredients = [...ingredients].sort((a, b) => a.id.localeCompare(b.id));
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: { select: { tasteJson: true } } }
    });
    const cachePayload = {
      ingredients: sortedIngredients.map((i) => ({
        id: i.id,
        amount: i.amount,
        amountLevel: i.amountLevel,
        expiry: i.expirationDate?.toISOString(),
      })),
      prefs: userData?.preferences?.tasteJson,
      servings,
      budget,
    };
    const requestHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(cachePayload))
      .digest("hex");

    // 4. Create pending generation record
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
        // Added fields
        servings: servings,
        budget: budget ?? undefined,
        requestHash: requestHash,
        generatedAt: new Date(),
      },
    });

    // 5. Start background processing (don't await)
    processMenuGeneration(
      generation.id,
      userId,
      ingredients,
      { servings, budget }, // Pass options
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
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Async Menu Generation Error:", err);
    return NextResponse.json(
      {
        error: "献立生成の開始に失敗しました",
        details: err.message ?? "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function processMenuGeneration(
  generationId: string,
  userId: string,
  ingredients: any[],
  options?: { servings: number; budget: number | null },
) {
  try {
    console.log(
      `[MenuGen] Starting process for generation ${generationId}, user ${userId}`,
    );

    // Update status to processing
    await prisma.menuGeneration.update({
      where: { id: generationId },
      data: { status: "processing" },
    });

    // Generate Menus via AI
    let menus;
    try {
      menus = await generateMenus(ingredients, userId, options);
    } catch (aiError: unknown) {
      const err = aiError as Error;
      console.error(`[MenuGen] AI Generation failed:`, err);
      throw err;
    }

    if (!menus?.main) {
      console.error(`[MenuGen] AI returned invalid menu structure:`, menus);
      throw new Error("AIが有効な献立を生成できませんでした");
    }

    console.log(`[MenuGen] AI success. Checking availability...`);

    // Check Availability for ALL Menus
    const mainDetails = checkIngredientAvailability(
      (menus.main.dishes ?? []).flatMap((d: any) => d.ingredients ?? []),
      ingredients,
    );

    const altADetails = menus.alternativeA
      ? checkIngredientAvailability(
        (menus.alternativeA.dishes ?? []).flatMap(
          (d: any) => d.ingredients ?? [],
        ),
        ingredients,
      )
      : mainDetails;

    const altBDetails = menus.alternativeB
      ? checkIngredientAvailability(
        (menus.alternativeB.dishes ?? []).flatMap(
          (d: any) => d.ingredients ?? [],
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
        main: evaluateNutrition(menus.main.dishes ?? []),
        altA: evaluateNutrition(menus.alternativeA?.dishes ?? []),
        altB: evaluateNutrition(menus.alternativeB?.dishes ?? []),
      } as any;
    } catch (e) {
      console.warn("[MenuGen] Nutrition calculation failed:", e);
    }

    console.log(`[MenuGen] Completing generation ${generationId}...`);

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
    console.log(`[MenuGen] Successfully completed generation ${generationId}`);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[MenuGen] Background processing error:", err);
    try {
      await prisma.menuGeneration.update({
        where: { id: generationId },
        data: { status: "failed" },
      });
    } catch (dbError) {
      console.error(
        "[MenuGen] Critical: Failed to update status to failed:",
        dbError,
      );
    }
  }
}
