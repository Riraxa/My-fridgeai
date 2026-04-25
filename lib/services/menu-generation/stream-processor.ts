import { prisma } from "@/lib/prisma";
import type { ConstraintMode } from "@/types";
import { generateLightMenusStream, type LightMenuGenerationResult } from "@/lib/ai/menu-generator";
import { validateAllMenusStrict } from "@/lib/ai/constraint-validator";
import { DEFAULT_IMPLICIT_INGREDIENTS } from "@/lib/constants/implicit-ingredients";
import { checkIngredientAvailability } from "@/lib/inventory";
import { incrementUserLimit } from "@/lib/aiLimit";
import type { Ingredient } from "@prisma/client";
import { evaluateNutrition } from "@/lib/nutrition/evaluation";

export interface ProcessPreferences {
  customImplicitIngredients?: string[];
  [key: string]: unknown;
}

interface DishIngredient {
  name: string;
  amount: number;
  unit: string;
}

export async function processMenuGeneration(
  generationId: string,
  userId: string,
  dbIngredients: Ingredient[],
  options: { servings: number; budget: number | null; mode: ConstraintMode },
  isPro: boolean,
  preferences: ProcessPreferences | null,
) {
  const startTime = Date.now();
  console.log(`>>>> [MenuStream] START: ${generationId} (UserId: ${userId}, Mode: ${options.mode})`);

  try {
    await prisma.menuGeneration.update({
      where: { id: generationId },
      data: { progressStep: "preparing" },
    });

    await prisma.menuGeneration.update({
      where: { id: generationId },
      data: { progressStep: "generating" },
    });

    let menus: LightMenuGenerationResult;
    try {
      menus = await generateLightMenusStream(
        dbIngredients,
        userId,
        options,
        (thoughts) => {
          prisma.menuGeneration.update({
            where: { id: generationId },
            data: { thoughts: thoughts as string[] } as Record<string, unknown>,
          }).catch(() => {});
        },
      );
    } catch (aiError: unknown) {
      console.error("[MenuStream] AI Generation FATAL Error:", aiError);
      throw aiError;
    }

    if (!menus?.mainPlan) {
      throw new Error("AI returned no main plan");
    }

    if (options.mode === "strict") {
      const allImplicit = [
        ...DEFAULT_IMPLICIT_INGREDIENTS,
        ...(preferences?.customImplicitIngredients || []),
      ];
      const constraintResult = validateAllMenusStrict(
        { main: menus.mainPlan as any, alternativeA: {} as any },
        dbIngredients,
        allImplicit,
      );
      if (!constraintResult.allValid) {
        await prisma.menuGeneration.update({
          where: { id: generationId },
          data: { status: "failed", progressStep: "failed" },
        });
        return;
      }
    }

    await prisma.menuGeneration.update({
      where: { id: generationId },
      data: { progressStep: "calculating" },
    });

    const mainDetails = checkIngredientAvailability(
      (menus.mainPlan.dishes ?? []).flatMap((d: { ingredients?: DishIngredient[] }) => d.ingredients ?? []),
      dbIngredients,
    );

    await prisma.menuGeneration.update({
      where: { id: generationId },
      data: { progressStep: "validating" },
    });

    let nutritionInfo: Record<string, Record<string, { calories: number; protein: number; fat: number; carbs: number }>> = {
      main: { total: { calories: 0, protein: 0, fat: 0, carbs: 0 } },
    };

    if (isPro) {
      try {
        nutritionInfo = {
          main: evaluateNutrition(menus.mainPlan.dishes || []) as any,
        };
      } catch (e) {
        console.warn("[MenuStream] Nutrition evaluation failed:", e);
      }
    }

    await prisma.menuGeneration.update({
      where: { id: generationId },
      data: {
        status: "completed",
        progressStep: "completed",
        mainMenu: menus.mainPlan,
        alternativeA: {},
        nutritionInfo: {
          ...nutritionInfo,
          scores: {
            main: nutritionInfo.main?.scores,
          },
        },
        usedIngredients: {
          main: mainDetails as any,
        },
        shoppingList: {
          main: options.mode === "strict" ? [] : (mainDetails.missing.concat(mainDetails.insufficient) as any),
        },
        generatedAt: new Date(),
      },
    });

    await incrementUserLimit(userId, "AI_MENU");
    console.log(`<<<< [MenuStream] ALL COMPLETED in ${Date.now() - startTime}ms`);
  } catch (error: unknown) {
    console.error("!!!! [MenuStream] FATAL ERROR:", error);
    try {
      await prisma.menuGeneration.update({
        where: { id: generationId },
        data: { status: "failed", progressStep: "failed" },
      });
    } catch (e) {
      console.error("[MenuStream] Emergency DB update failed:", e);
    }
  }
}
