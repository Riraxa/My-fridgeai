// GENERATED_BY_AI: 2026-03-18 antigravity
// app/api/menu/generate-async/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateMenus, generateMenusCached } from "@/lib/ai/menu-generator";
import { checkIngredientAvailability } from "@/lib/inventory";
import { checkUserLimit, incrementUserLimit, AI_LIMIT_FREE, AI_LIMIT_PRO } from "@/lib/aiLimit";
import { validateAllMenusStrict } from "@/lib/ai/constraint-validator";
import { sendPushToMultiple } from "@/lib/push";
import type { ConstraintMode } from "@/types";

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
    const limitCheck = await checkUserLimit(userId, "AI_MENU", { readonly: true });
    if (!limitCheck.ok) {
      return NextResponse.json(
        { error: "1日の生成回数制限に達しました" },
        { status: 429 },
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 進行中または完了した生成のみをカウント（失敗したものは除外）
    const count = await prisma.menuGeneration.count({
      where: {
        userId: userId,
        generatedAt: { gte: today },
        status: { in: ["completed", "pending", "processing"] },
      },
    });

    const isPro = (await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }))?.plan === "PRO";
    const limit = isPro ? AI_LIMIT_PRO : AI_LIMIT_FREE;

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
    let { servings, budget, mode, source } = body;
    if (source !== "onboarding") source = "default";

    // Validate mode
    const validModes: ConstraintMode[] = ["strict", "flexible"];
    if (mode && !validModes.includes(mode)) {
      mode = "strict"; // デフォルトは Strict
    }
    if (!mode) {
      mode = "strict"; // デフォルトは Strict
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

    // Log usage (non-blocking)
    void prisma.usageHistory.create({
      data: {
        userId,
        action: "GENERATE_MENU_ASYNC",
        meta: {
          source,
          servings,
          mode,
          budget,
          menuGenerationId: generation.id,
        } as any,
      },
    }).catch(() => {});

    // 5. Start background processing (don't await)
    processMenuGeneration(
      generation.id,
      userId,
      ingredients,
      { servings, budget, mode }, // Pass options including mode
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
  options?: { servings: number; budget: number | null; mode?: ConstraintMode },
) {
  try {
    console.log(
      `[MenuGen] Starting process for generation ${generationId}`,
    );

    // ユーザーのカスタム暗黙食材とデフォルト食材選択を取得
    const userPrefs = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { 
        customImplicitIngredients: true,
        implicitIngredients: true,
      },
    });
    const customImplicitIngredients = userPrefs?.customImplicitIngredients ?? [];
    const selectedImplicitIngredients = userPrefs?.implicitIngredients ?? [];
    
    // デフォルト食材とカスタム食材をマージ
    const allImplicitIngredients = [
      ...selectedImplicitIngredients,
      ...customImplicitIngredients,
    ];

    // Update status to processing
    await prisma.menuGeneration.update({
      where: { id: generationId },
      data: { 
        status: "processing",
        progressStep: "generating"
      },
    });

    // Generate Menus via AI using parallel generation with caching
    let menus;
    try {
      const { result, fromCache } = await generateMenusCached(ingredients, userId, options);
      menus = result;
      if (fromCache) {
        console.log(`[MenuGen] AI cache HIT for generation ${generationId}, skipping API calls`);
      }
    } catch (aiError: unknown) {
      const err = aiError as Error;
      console.error(`[MenuGen] AI Generation failed:`, err);
      throw err;
    }

    if (!menus?.main) {
      console.error(`[MenuGen] AI returned invalid menu structure:`, menus);
      throw new Error("AIが有効な献立を生成できませんでした");
    }

    // Strict モードのセカンダリバリデーション
    if (options?.mode === "strict") {
      const constraintResult = validateAllMenusStrict(menus, ingredients, allImplicitIngredients);
      if (!constraintResult.allValid) {
        console.warn(
          `[MenuGen] Strict constraint violations detected:`,
          JSON.stringify(constraintResult.results, null, 2),
        );
        // 制約違反があった場合は failed として記録
        await prisma.menuGeneration.update({
          where: { id: generationId },
          data: { status: "failed" },
        });
        return; // processMenuGeneration を中止
      }
    }

    console.log(`[MenuGen] AI success. Checking availability...`);

    // Update progress to calculating
    await prisma.menuGeneration.update({
      where: { id: generationId },
      data: { progressStep: "calculating" },
    });

    // Check Availability for ALL Menus
    const mainDetails = checkIngredientAvailability(
      (menus.main.dishes ?? []).flatMap((d: any) => d.ingredients ?? []),
      ingredients,
      allImplicitIngredients,
    );

    const altADetails = menus.alternativeA
      ? checkIngredientAvailability(
        (menus.alternativeA.dishes ?? []).flatMap(
          (d: any) => d.ingredients ?? [],
        ),
        ingredients,
        allImplicitIngredients,
      )
      : mainDetails;

    const altBDetails = menus.alternativeB
      ? checkIngredientAvailability(
        (menus.alternativeB.dishes ?? []).flatMap(
          (d: any) => d.ingredients ?? [],
        ),
        ingredients,
        allImplicitIngredients,
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

    // Update progress to validating
    await prisma.menuGeneration.update({
      where: { id: generationId },
      data: { progressStep: "validating" },
    });

    // Update with completed data
    await prisma.menuGeneration.update({
      where: { id: generationId },
      data: {
        status: "completed",
        progressStep: "completed",
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

    // 成功時にはじめてカウントアップを行う
    await incrementUserLimit(userId, "AI_MENU");

    // 献立生成完了プッシュ通知を送信
    try {
      const pushSubscriptions = await prisma.pushSubscription.findMany({
        where: { userId, isActive: true },
      });
      
      if (pushSubscriptions.length > 0) {
        const subscriptions = pushSubscriptions.map((sub) => ({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }));
        
        const mainDishName = menus.main?.dishes?.[0]?.name ?? "献立";
        
        await sendPushToMultiple(subscriptions, {
          title: "🍳 献立が完成しました！",
          body: `「${mainDishName}」などの献立をご用意しました。アプリで確認してください。`,
          tag: "menu-complete",
          url: "/menu/generate",
        });
        
        console.log(`[MenuGen] Push notification sent to ${subscriptions.length} devices`);
      }
    } catch (pushError) {
      // プッシュ通知の失敗は献立生成自体の成功を妨げない
      console.error("[MenuGen] Failed to send push notification:", pushError);
    }
    
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
