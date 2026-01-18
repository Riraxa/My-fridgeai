import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMenus } from "@/lib/ai/menu-generator";
import { checkIngredientAvailability } from "@/lib/inventory";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id; // Corrected to use ID directly

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
        userId,
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
      prisma.ingredient.findMany({ where: { userId } }),
      prisma.userPreferences.findUnique({ where: { userId } }),
    ]);

    if (ingredients.length === 0) {
      return NextResponse.json(
        { error: "冷蔵庫に食材がありません" },
        { status: 400 },
      );
    }

    // 3. Detect Expiring Items
    const now = new Date();
    const expiringSoon = ingredients.filter((i) => {
      if (!i.expirationDate) return false;
      const diff = i.expirationDate.getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days <= 3; // 3 days rule
    });

    // 4. Generate Menus via AI
    let menus;
    try {
      menus = await generateMenus(ingredients, preferences, expiringSoon);
    } catch (error: any) {
      // AI Error Handling
      console.error("AI Gen Error:", error);
      return NextResponse.json(
        {
          error: "献立の生成に失敗しました",
          details: error.message,
        },
        { status: 500 },
      );
    }

    // Calculate Nutrition (Pro Feature)
    let nutritionInfo = undefined;
    // Allow dev for testing or if Pro
    if (isPro || process.env.NODE_ENV === "development") {
      try {
        // Dynamic import to avoid circular dep if any, though likely fine static
        const { evaluateNutrition } = await import("@/lib/nutrition");
        nutritionInfo = {
          main: evaluateNutrition(menus.main.dishes),
          altA: evaluateNutrition(menus.alternativeA.dishes),
          altB: evaluateNutrition(menus.alternativeB.dishes),
        };
      } catch (e) {
        console.warn("Nutrition calculation failed:", e);
      }
    }

    // 5. Check Availability for ALL Menus
    // We calculate availability for main, altA, and altB to ensure shopping lists are accurate for whichever the user picks
    const mainDetails = checkIngredientAvailability(
      menus.main.dishes.flatMap((d) => d.ingredients),
      ingredients,
    );

    const altADetails = checkIngredientAvailability(
      menus.alternativeA.dishes.flatMap((d) => d.ingredients),
      ingredients,
    );

    const altBDetails = checkIngredientAvailability(
      menus.alternativeB.dishes.flatMap((d) => d.ingredients),
      ingredients,
    );

    // 6. Save to DB
    // We store the "main" availability as default usedIngredients/shoppingList context,
    // but we could extend the schema to store per-option availability if needed.
    // For now, based on schema, we store the *generated* menus.
    // The previous schema had `shoppingList` as a single JSON.
    // We will store the structure { main: ..., altA: ..., altB: ... } in shoppingList for flexibility or just main?
    // User requested "Check availability for all 3 menus".
    // Saving all of them into the JSON fields allows frontend to switch context.

    // Note: Schema for `shoppingList` and `usedIngredients` is JSON.
    // I will store an object keyed by menu type.

    const generation = await prisma.menuGeneration.create({
      data: {
        userId,
        mainMenu: menus.main as any,
        alternativeA: menus.alternativeA as any,
        alternativeB: menus.alternativeB as any,
        nutritionInfo: nutritionInfo as any, // Add nutrition info

        // Storing structure for all options
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

        status: "completed",
      },
    });

    return NextResponse.json({
      success: true,
      menuGenerationId: generation.id,
      menus: menus,
      // Return availability for frontend immediate display
      availability: {
        altA: altADetails,
        altB: altBDetails,
      },
      nutrition: nutritionInfo, // Return for frontend display
    });
  } catch (error) {
    console.error("Menu Generation Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
