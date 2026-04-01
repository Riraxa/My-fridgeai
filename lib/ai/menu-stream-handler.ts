// lib/ai/menu-stream-handler.ts
import { prisma } from "@/lib/prisma";
import { checkIngredientAvailability } from "@/lib/inventory";
import { incrementUserLimit } from "@/lib/aiLimit";
import { validateAllMenusStrict } from "@/lib/ai/constraint-validator";
import { sendPushToMultiple } from "@/lib/push";
import type { ConstraintMode } from "@/types";

/**
 * AIによって生成された献立データを検証し、DBを更新し、付帯処理（栄養計算、通知等）を行う共通関数
 */
export async function finalizeMenuGeneration(
  generationId: string,
  userId: string,
  menus: any,
  ingredients: any[],
  options: { servings: number; budget: number | null; mode: ConstraintMode }
) {
  try {
    console.log(`[MenuStreamHandler] Finalizing generation ${generationId}`);

    // 1. ユーザーのカスタム暗黙食材を取得
    const userPrefs = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { 
        customImplicitIngredients: true,
        implicitIngredients: true,
      },
    });
    const allImplicitIngredients = [
      ...(userPrefs?.implicitIngredients ?? []),
      ...(userPrefs?.customImplicitIngredients ?? []),
    ];

    // 2. Strict モードのバリデーション
    if (options.mode === "strict") {
      const constraintResult = validateAllMenusStrict(menus, ingredients, allImplicitIngredients);
      if (!constraintResult.allValid) {
        console.warn(`[MenuStreamHandler] Strict constraint violations detected`);
        await prisma.menuGeneration.update({
          where: { id: generationId },
          data: { status: "failed" },
        });
        return { success: false, error: "制約違反が検出されました" };
      }
    }

    // 3. 在庫チェック
    const mainDetails = checkIngredientAvailability(
      (menus.main?.dishes ?? []).flatMap((d: any) => d.ingredients ?? []),
      ingredients,
      allImplicitIngredients
    );
    const altADetails = menus.alternativeA
      ? checkIngredientAvailability(
          (menus.alternativeA.dishes ?? []).flatMap((d: any) => d.ingredients ?? []),
          ingredients,
          allImplicitIngredients
        )
      : mainDetails;
    const altBDetails = menus.alternativeB
      ? checkIngredientAvailability(
          (menus.alternativeB.dishes ?? []).flatMap((d: any) => d.ingredients ?? []),
          ingredients,
          allImplicitIngredients
        )
      : mainDetails;

    // 4. 栄養計算
    let nutritionInfo = {
      main: { total: { calories: 0, protein: 0, fat: 0, carbs: 0 } },
      altA: { total: { calories: 0, protein: 0, fat: 0, carbs: 0 } },
      altB: { total: { calories: 0, protein: 0, fat: 0, carbs: 0 } },
    };
    try {
      const { evaluateNutrition } = await import("@/lib/nutrition");
      nutritionInfo = {
        main: evaluateNutrition(menus.main?.dishes ?? []),
        altA: evaluateNutrition(menus.alternativeA?.dishes ?? []),
        altB: evaluateNutrition(menus.alternativeB?.dishes ?? []),
      } as any;
    } catch (e) {
      console.warn("[MenuStreamHandler] Nutrition calculation failed:", e);
    }

    // 5. DB更新
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

    // 6. カウントアップ
    await incrementUserLimit(userId, "AI_MENU");

    // 7. プッシュ通知
    await notifyUser(userId, menus.main?.dishes?.[0]?.name);

    return { success: true };
  } catch (error) {
    console.error("[MenuStreamHandler] Error in finalizeMenuGeneration:", error);
    await prisma.menuGeneration.update({
      where: { id: generationId },
      data: { status: "failed" },
    }).catch(console.error);
    return { success: false, error: (error as Error).message };
  }
}

async function notifyUser(userId: string, mainDishName?: string) {
  try {
    const pushSubscriptions = await prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
    });
    if (pushSubscriptions.length === 0) return;

    const subscriptions = pushSubscriptions.map((sub) => ({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    }));

    await sendPushToMultiple(subscriptions, {
      title: "🍳 献立が完成しました！",
      body: `「${mainDishName ?? "献立"}」などの献立をご用意しました。`,
      tag: "menu-complete",
      url: "/menu/generate",
    });
  } catch (pushError) {
    console.error("[MenuStreamHandler] Push notification failed:", pushError);
  }
}
