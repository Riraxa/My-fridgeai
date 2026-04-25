// lib/ai/menu-generator.ts
import { Ingredient, UserPreferences } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ConstraintMode } from "@/types";
import {
  generateWeeklyPlanAgent,
  generateLightMenusAgent,
} from "@/lib/agents/fridge-agent";
import type {
  IngredientInput,
  UserContext,
  LightMenuGenerationResult,
} from "@/lib/agents/schemas/menu";

export type { LightMenuGenerationResult };



// --- Shared Helpers ---

/**
 * AIが必要とする共通のユーザーコンテキストを取得・構築します。
 */
async function getGenerationContext(
  userId: string,
  options?: { servings?: number; budget?: number | null; mode?: ConstraintMode }
): Promise<UserContext> {
  const [preferences, allergies, restrictions] = await Promise.all([
    prisma.$queryRaw<UserPreferences[]>`SELECT * FROM "UserPreferences" WHERE "userId" = ${userId} LIMIT 1`.then(rows => rows[0] || null),
    prisma.userAllergy.findMany({ where: { userId } }),
    prisma.userRestriction.findMany({ where: { userId } }),
  ]);



  return {
    userId,
    servings: options?.servings ?? 1,
    budget: options?.budget ?? null,
    mode: options?.mode ?? "flexible",
    cookingSkill: (preferences?.cookingSkill === "expert" ? "advanced" : preferences?.cookingSkill ?? "intermediate") as "beginner" | "intermediate" | "advanced",
    allergies: allergies.map((a) => a.allergen),
    restrictions: restrictions.map((r) => ({ type: r.type, note: r.note ?? undefined })),
    taste: {},
    preferences: {
      kitchenEquipment: preferences?.kitchenEquipment as string[] | undefined,
      comfortableMethods: preferences?.comfortableMethods as string[] | undefined,
      avoidMethods: preferences?.avoidMethods as string[] | undefined,
    },
    aiMessageEnabled: Boolean(preferences?.aiMessageEnabled),
    implicitIngredients: [
      ...(preferences?.implicitIngredients as string[] | undefined ?? []),
      ...(preferences?.customImplicitIngredients as string[] | undefined ?? [])
    ],
  };
}

/**
 * DBの食材モデルをAIエージェント用の入力形式に変換します。
 */
function mapToAgentIngredients(ingredients: Ingredient[]): IngredientInput[] {
  return ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    amount: i.amount ?? undefined,
    unit: i.unit ?? undefined,
    expirationDate: i.expirationDate ?? undefined,
    ingredientType: ((i as { ingredientType?: string }).ingredientType ?? "raw") as "raw" | "processed_base" | "instant_complete",
  }));
}

// --- Generation Services ---


/**
 * 1週間分の夕食献立を一括生成。
 */
export async function generateWeeklyPlanAI(
  ingredients: Ingredient[],
  preferences: UserPreferences | null,
): Promise<any[]> {
  const userId = preferences?.userId ?? "unknown";
  const context = await getGenerationContext(userId, { mode: "flexible" });
  const agentIngredients = mapToAgentIngredients(ingredients);
  return await generateWeeklyPlanAgent(agentIngredients, context);
}

/**
 * 軽量版献立生成（高速・低コスト）。
 * ストリーミング対応。AIによる客観的スコア評価を含む。
 * 最新版 2案（Main & Alternative）比較形式。
 */
export async function generateLightMenusStream(
  ingredients: Ingredient[],
  userId: string,
  options?: { servings?: number; budget?: number | null; mode?: ConstraintMode },
  onThoughtsUpdate?: (thoughts: string[]) => void,
): Promise<LightMenuGenerationResult> {
  const context = await getGenerationContext(userId, options);
  const agentIngredients = mapToAgentIngredients(ingredients);

  // AIによる生成を実行（スコア算出もAIに任せる）
  return await generateLightMenusAgent(agentIngredients, context, onThoughtsUpdate);
}
