import { calculateScores } from "@/lib/scoring/calculateScores";
import { prisma } from "@/lib/prisma";
import { checkIngredientAvailability } from "@/lib/inventory";
import { incrementUserLimit } from "@/lib/aiLimit";
import { validateAllMenusStrict } from "@/lib/ai/constraint-validator";
import { sendPushToMultiple } from "@/lib/push";
import type { ConstraintMode } from "@/types";

// 2案形式の献立データ型
interface TwoPlanMenuData {
  mainPlan?: {
    title: string;
    reason: string;
    tags: string[];
    dishes: any[];
    role: string;
    // scores removed - calculated server-side
  };
  alternativePlan?: {
    title: string;
    reason: string;
    tags: string[];
    dishes: any[];
    role: string;
    specializationReason: string;
    // scores removed - calculated server-side
  };
  lightSuggestion?: {
    text: string;
    label: string;
    confidence: number;
    hint?: string;
  };
  comparison?: {
    mainPlan?: {
      inventoryUsage?: number;
      costEfficiency?: number;
      healthScore?: number;
      timeEfficiency?: number;
    };
    alternativePlan?: {
      inventoryUsage?: number;
      costEfficiency?: number;
      healthScore?: number;
      timeEfficiency?: number;
    };
    summary?: {
      mainPlanStrength: string;
      alternativePlanStrength: string;
    };
  };

  main?: any;
  alternativeA?: any;
  alternativeB?: any;
}

export function normalizeMenuData(menus: TwoPlanMenuData): {
  main: any;
  alternativeA: any;
  alternativeB: any;
  lightSuggestion: any;
  comparison: any;
} {
  // 2案形式を検出
  if (menus.mainPlan && menus.alternativePlan) {
    return {
      main: {
        title: menus.mainPlan.title,
        reason: menus.mainPlan.reason,
        tags: menus.mainPlan.tags,
        dishes: menus.mainPlan.dishes,
        role: menus.mainPlan.role,
      },
      alternativeA: {
        title: menus.alternativePlan.title,
        reason: menus.alternativePlan.reason,
        tags: menus.alternativePlan.tags,
        dishes: menus.alternativePlan.dishes,
        role: menus.alternativePlan.role,
        specializationReason: menus.alternativePlan.specializationReason,
      },
      alternativeB: menus.lightSuggestion ? {
        text: menus.lightSuggestion.text,
        label: menus.lightSuggestion.label,
        confidence: menus.lightSuggestion.confidence,
        hint: menus.lightSuggestion.hint,
      } : undefined,
      lightSuggestion: menus.lightSuggestion,
      comparison: menus.comparison,
    };
  }

  return {
    main: menus.main,
    alternativeA: menus.alternativeA,
    alternativeB: menus.alternativeB,
    lightSuggestion: null,
    comparison: null,
  };
}
export async function finalizeMenuGeneration(
  generationId: string,
  userId: string,
  menus: any,
  ingredients: any[],
  options: { servings: number; budget: number | null; mode: ConstraintMode }
) {
  try {
    const normalized = normalizeMenuData(menus);
    const { main, alternativeA, alternativeB, lightSuggestion, comparison } = normalized;

    // === 即座に完了ステータスを設定（ユーザーに速く結果を表示）===
    // 最小限のデータのみを即座に更新 - 大きなJSONフィールドは後で
    const quickUpdatePromise = prisma.menuGeneration.update({
      where: { id: generationId },
      data: {
        status: "completed",
        progressStep: "completed",
        mainMenu: main as any,
        alternativeA: alternativeA as any,
        alternativeB: alternativeB as any,
      },
    });
    
    const dbTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("DB update timeout")), 3000)
    );
    
    try {
      await Promise.race([quickUpdatePromise, dbTimeoutPromise]);
      console.log(`[MenuStream] Status updated to completed for ${generationId}`);
    } catch (dbError) {
      console.error(`[MenuStream] Quick update failed:`, dbError);
      // 失敗しても続行 - 後続の更新で上書きされる
    }

    // === 以下、バックグラウンドで詳細計算を実行 ===
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

    // 3. Strict モードのバリデーション
    if (options.mode === "strict") {
      const constraintResult = validateAllMenusStrict(menus, ingredients, allImplicitIngredients);
      if (!constraintResult.allValid) {
        await prisma.menuGeneration.update({
          where: { id: generationId },
          data: { status: "failed" },
        });
        return { success: false, error: "制約違反が検出されました" };
      }
    }

    // 4. 在庫チェック
    const mainDetails = checkIngredientAvailability(
      (main?.dishes ?? []).flatMap((d: any) => d.ingredients ?? []),
      ingredients,
      allImplicitIngredients
    );
    const altADetails = alternativeA
      ? checkIngredientAvailability(
          (alternativeA.dishes ?? []).flatMap((d: any) => d.ingredients ?? []),
          ingredients,
          allImplicitIngredients
        )
      : mainDetails;

    // 5. 栄養計算
    let nutritionInfo: any;
    try {
      const { evaluateNutrition } = await import("@/lib/nutrition");
      // タイムアウト付きで栄養計算（5秒以内）
      const nutritionPromise = Promise.all([
        evaluateNutrition(main?.dishes ?? []),
        alternativeA ? evaluateNutrition(alternativeA?.dishes ?? []) : Promise.resolve(null),
      ]);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Nutrition calculation timeout")), 5000)
      );
      
      const [mainNutrition, altANutrition] = await Promise.race([
        nutritionPromise,
        timeoutPromise,
      ]) as [any, any];
      
      // スコアを取得（AIが計算したスコアを使用、なければデフォルト値）
      const mainScores = menus.comparison?.mainPlan || {};
      const altScores = menus.comparison?.alternativePlan || {};
      
      nutritionInfo = {
        main: mainNutrition,
        altA: altANutrition || mainNutrition,
        lightSuggestion,
        comparison,
        // AI計算スコアまたはデフォルト値
        scores: {
          main: {
            inventoryUsage: mainScores.inventoryUsage ?? 75,
            costEfficiency: mainScores.costEfficiency ?? 75,
            healthScore: mainScores.healthScore ?? 75,
            timeEfficiency: mainScores.timeEfficiency ?? undefined,
          },
          altA: {
            inventoryUsage: altScores.inventoryUsage ?? 70,
            costEfficiency: altScores.costEfficiency ?? 70,
            healthScore: altScores.healthScore ?? 70,
            timeEfficiency: altScores.timeEfficiency ?? undefined,
          },
        },
      };
    } catch (e) {
      nutritionInfo = {
        main: { total: { calories: 0, protein: 0, fat: 0, carbs: 0 } },
        altA: { total: { calories: 0, protein: 0, fat: 0, carbs: 0 } },
        lightSuggestion,
        comparison,
        scores: {
          main: {
            inventoryUsage: menus.comparison?.mainPlan?.inventoryUsage ?? 75,
            costEfficiency: menus.comparison?.mainPlan?.costEfficiency ?? 75,
            healthScore: menus.comparison?.mainPlan?.healthScore ?? 75,
            timeEfficiency: menus.comparison?.mainPlan?.timeEfficiency ?? undefined,
          },
          altA: {
            inventoryUsage: menus.comparison?.alternativePlan?.inventoryUsage ?? 70,
            costEfficiency: menus.comparison?.alternativePlan?.costEfficiency ?? 70,
            healthScore: menus.comparison?.alternativePlan?.healthScore ?? 70,
            timeEfficiency: menus.comparison?.alternativePlan?.timeEfficiency ?? undefined,
          },
        },
      };
    }

    // 6. スコア計算（非同期・サーバー側）
    void calculateScores(generationId).catch((err) => {
      console.error(`[MenuStream] Score calculation failed: ${err}`);
    });

    // 7. 詳細データをDBに更新（既存レコードにマージ）
    void prisma.menuGeneration.update({
      where: { id: generationId },
      data: {
        nutritionInfo: nutritionInfo as any,
        usedIngredients: {
          main: mainDetails.available,
          altA: altADetails.available,
        } as any,
        shoppingList: {
          main: mainDetails.missing.concat(mainDetails.insufficient),
          altA: altADetails.missing.concat(altADetails.insufficient),
        } as any,
      },
    }).then(() => {
      console.log(`[MenuStream] Full update completed for ${generationId}`);
    }).catch((err) => {
      console.error(`[MenuStream] Full update failed:`, err);
    });

    // 8. カウントアップとプッシュ通知
    void incrementUserLimit(userId, "AI_MENU").catch(() => {});
    void notifyUser(userId, main?.dishes?.[0]?.name);

    return { success: true };
  } catch (error) {
    await prisma.menuGeneration.update({
      where: { id: generationId },
      data: { status: "failed" },
    }).catch(() => {});
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
    // Silent fail for push notification
  }
}
