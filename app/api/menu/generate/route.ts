// GENERATED_BY_AI: 2026-03-18 antigravity
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateMenus, generateMenusCached } from "@/lib/ai/menu-generator";
import { checkIngredientAvailability } from "@/lib/inventory";
import { checkUserLimit, incrementUserLimit, AI_LIMIT_FREE, AI_LIMIT_PRO } from "@/lib/aiLimit";
import { validateAllMenusStrict } from "@/lib/ai/constraint-validator";
import type { ConstraintMode } from "@/types";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const userId = session.user.id;

    // 1. Check User Plan & Rate Limits
    const limitCheck = await checkUserLimit(userId, "AI_MENU", { readonly: true });
    if (!limitCheck.ok) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      });
      const isPro = user?.plan === "PRO";
      const limitText = isPro ? `1日${AI_LIMIT_PRO}回` : `1日${AI_LIMIT_FREE}回`;

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
    const ingredients = userData?.Ingredient ?? [];
    // preferences is stored but not used in current implementation

    if (ingredients.length === 0) {
      return NextResponse.json(
        { error: "冷蔵庫に食材がありません。先に食材を追加してください。" },
        { status: 400 },
      );
    }

    // 3. Parse & Validate Options
    const body = await req.json().catch(() => ({}));
    let { servings, budget, mode } = body;

    // Validate mode
    const validModes: ConstraintMode[] = ["strict", "flexible"];
    if (mode && !validModes.includes(mode)) {
      mode = "strict";
    }
    if (!mode) {
      mode = "strict";
    }

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

    // 3.5. Hash calculation for caching
    const crypto = await import("crypto");
    const sortedIngredients = [...ingredients].sort((a, b) => a.id.localeCompare(b.id));
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

    const cacheExpiryTs = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const cachedGeneration = await prisma.menuGeneration.findFirst({
      where: {
        userId,
        requestHash,
        status: "completed",
        generatedAt: { gte: cacheExpiryTs },
      },
      orderBy: { generatedAt: "desc" },
    });

    let menus: any;
    let isCached = false;

    if (cachedGeneration) {
      menus = {
        main: cachedGeneration.mainMenu,
        alternativeA: cachedGeneration.alternativeA,
        alternativeB: cachedGeneration.alternativeB,
      };
      isCached = true;
      console.log("[Menu Generation] Cache HIT! Using cached generation:", cachedGeneration.id);
    } else {
      // 4. Generate Menus via AI using parallel generation with caching
      const aiResult = await generateMenusCached(
        ingredients,
        userId,
        { servings, budget, mode }
      );
      
      menus = aiResult.result;
      const aiCacheHit = aiResult.fromCache;
      
      if (aiCacheHit) {
        console.log("[Menu Generation] AI cache HIT! Skipping API call.");
      }
      
      if (!menus?.main) {
        throw new Error("AIが有効な献立を生成できませんでした");
      }

      // Strict モード: セカンダリ制約バリデーション
      if (mode === "strict") {
        const constraintResult = validateAllMenusStrict(menus, ingredients);
        if (!constraintResult.allValid) {
          console.warn(
            "[Menu Generation] Strict constraint violations:",
            JSON.stringify(constraintResult.results, null, 2),
          );
          return NextResponse.json(
            {
              error: "INSUFFICIENT_INVENTORY",
              message: "現在の在庫では条件を満たす献立を生成できません",
            },
            { status: 409 },
          );
        }
      }
    }

    // 5. Check Availability for ALL Menus
    // Pass servings to availability check if needed (currently checking generic existence,
    // but future improvement could check scaled amounts. For now, we adjust generated amounts)

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
      let menuGenerationId = cachedGeneration?.id;

      if (!isCached) {
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
            requestHash: requestHash,

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
        menuGenerationId = generation.id;
        
        // 成功時にはじめてカウントアップを行う
        await incrementUserLimit(userId, "AI_MENU");
      }

      return NextResponse.json({
        success: true,
        menuGenerationId,
        isCached,
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
        details: error.message ?? "Unknown error",
      },
      { status: 500 },
    );
  } finally {
    // 非同期で利用履歴を記録（成功・失敗に関わらず）
    // userIdが取得できている場合のみ記録
    const userId = (await auth())?.user?.id;
    if (userId) {
      // ここではbodyのパースに失敗している可能性もあるため、
      // 必要な変数がスコープ外の場合はデフォルト値を使用
      void prisma.usageHistory.create({
        data: {
          userId,
          action: "GENERATE_MENU",
          meta: {
            generatedAt: new Date().toISOString(),
            // これらの変数は本来 try 内にあるが、ようやくここまで来た
          } as any,
        },
      }).catch(err => console.error("Failed to log usage history:", err));
    }
  }
}
