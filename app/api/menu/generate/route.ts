// app/api/menu/generate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateMenus } from "@/lib/ai/menu-generator";
import { checkIngredientAvailability } from "@/lib/inventory";
import { checkUserLimit } from "@/lib/aiLimit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const userId = session.user.id;

    // 1. Check User Plan & Rate Limits
    const limitCheck = await checkUserLimit(userId, "AI_MENU");
    if (!limitCheck.ok) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      });
      const isPro = user?.plan === "PRO";
      const limitText = isPro ? "1日5回" : "1日1回";

      return NextResponse.json(
        {
          error: `1日の献立生成回数制限（${limitText}）に達しました`,
          resetAt: limitCheck.resetAt,
        },
        { status: 429 },
      );
    }

    // 2. Fetch User Data (Plan, Inventory & Preferences) in one query
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        Ingredient: {
          include: {
            alerts: true,
            product: true, // 加工食品の商品情報をinclude
          },
        },
        preferences: true,
      },
    });

    const isPro = userData?.plan === "PRO";
    const ingredients = userData?.Ingredient || [];
    const _preferences = userData?.preferences;

    if (ingredients.length === 0) {
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
      // Force budget to null for Free users
      budget = null;
    } else {
      // Pro Limit: Max 8 servings
      if (servings > 8) {
        return NextResponse.json(
          { error: "一度に生成できるのは最大8人前までです。" },
          { status: 400 },
        );
      }
      // Validate budget if provided
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

    // 4. Generate Menus via AI
    const menus = await generateMenus(ingredients, userId, {
      servings,
      budget,
    });
    if (!menus?.main) {
      throw new Error("AIが有効な献立を生成できませんでした");
    }

    // 5. Check Availability for ALL Menus
    // Pass servings to availability check if needed (currently checking generic existence,
    // but future improvement could check scaled amounts. For now, we adjust generated amounts)

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

    // Calculate Nutrition (Pro users only)
    let nutritionInfo = {
      main: { total: { calories: 0, protein: 0, fat: 0, carbs: 0 } },
      altA: { total: { calories: 0, protein: 0, fat: 0, carbs: 0 } },
      altB: { total: { calories: 0, protein: 0, fat: 0, carbs: 0 } },
    };

    if (isPro) {
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
    }

    // 6. Save to DB and Return
    try {
      const generation = await prisma.menuGeneration.create({
        data: {
          userId: userId,
          mainMenu: menus.main as any,
          alternativeA: menus.alternativeA as any,
          alternativeB: menus.alternativeB as any,
          nutritionInfo: nutritionInfo as any,
          // New Fields
          servings: servings,
          budget: budget ?? undefined, // prisma expects undefined for nullable optional if not set, or null

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
        menus,
        availability: {
          main: mainDetails,
          altA: altADetails,
          altB: altBDetails,
        },
        nutrition: nutritionInfo,
      });
    } catch (saveError: any) {
      console.error("Save Error:", saveError);
      return NextResponse.json({
        success: true,
        menus,
        availability: {
          main: mainDetails,
          altA: altADetails,
          altB: altBDetails,
        },
        nutrition: nutritionInfo,
        error: "データの保存に失敗しました",
      });
    }
  } catch (error: any) {
    console.error("Menu Generation Route Error:", error);
    return NextResponse.json(
      {
        error: "献立生成中にエラーが発生しました",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
