//lib/ai/menu-generator.ts
import { Ingredient, UserPreferences } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ConstraintMode } from "@/types";
import { generateMenusAgent, generateWeeklyPlanAgent } from "@/lib/agents/fridge-agent";

type IngredientWithProduct = Ingredient & {
  product?: {
    id: string;
    name: string;
    brandName: string | null;
    ingredientType: string;
    requiresAdditionalIngredients: unknown;
    instructionTemplate: string | null;
    nutritionEstimate: unknown;
  } | null;
};

export interface GeneratedMenu {
  title: string;
  reason: string;
  tags: string[];
  dishes: {
    type: string;
    name: string;
    cookingTime: number;
    difficulty: number;
    ingredients: {
      name: string;
      amount: number;
      unit: string;
    }[];
    steps: string[];
    tips: string;
    nutrition?: {
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
      salt?: number;
    };
  }[];
}

export interface MenuGenerationResult {
  main: GeneratedMenu;
  alternativeA: GeneratedMenu;
  alternativeB: GeneratedMenu;
}

type TasteLifestyleMode = {
  timePriority?: string;
  dishwashingAvoid?: boolean;
  singlePan?: boolean;
};

type TasteJson = {
  tasteScores?: Record<string, number>;
  lifestyle?: {
    weekdayMode?: TasteLifestyleMode;
    weekendMode?: TasteLifestyleMode;
    defaultMode?: TasteLifestyleMode;
  };
  freeText?: string;
  equipment?: string[];
  preferredMethods?: string[];
  recentGenrePenalty?: Record<string, number>;
};

/**
 * Generate 3 menu patterns using OpenAI
 */
export async function generateMenus(
  ingredients: IngredientWithProduct[],
  userId: string,
  options?: { servings?: number; budget?: number | null; mode?: ConstraintMode },
): Promise<MenuGenerationResult> {
  const [preferences, allergies, restrictions] = await Promise.all([
    prisma
      .$queryRaw<UserPreferences[]>`SELECT * FROM "UserPreferences" WHERE "userId" = ${userId} LIMIT 1`
      .then((rows) => (rows.length > 0 ? rows[0] : null)),
    prisma.userAllergy.findMany({ where: { userId } }),
    prisma.userRestriction.findMany({ where: { userId } }),
  ]);

  const servings = options?.servings ?? 1;
  const budget = options?.budget ?? null;
  const constraintMode: ConstraintMode = options?.mode ?? "flexible";

  const taste = (preferences?.tasteJson as TasteJson | null | undefined) ?? {};

  // デフォルト食材選択とカスタム食材を取得
  const implicitIngredients = (preferences?.implicitIngredients as string[] | undefined) ?? [];
  const customImplicitIngredients = (preferences?.customImplicitIngredients as string[] | undefined) ?? [];
  const allImplicitIngredients = [...implicitIngredients, ...customImplicitIngredients];

  const agentIngredients = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    amount: i.amount ?? undefined,
    unit: i.unit ?? undefined,
    amountLevel: i.amountLevel ?? undefined,
    expirationDate: i.expirationDate ?? undefined,
    ingredientType:
      ((i as unknown) as {
        ingredientType?: "raw" | "processed_base" | "instant_complete";
      }).ingredientType ?? "raw",
  }));

  const agentContext = {
    userId,
    servings,
    budget,
    mode: constraintMode,
    cookingSkill: (preferences?.cookingSkill ?? "intermediate") as
      | "beginner"
      | "intermediate"
      | "advanced",
    allergies: allergies.map((a) => a.allergen),
    restrictions: restrictions.map((r) => ({ type: r.type, note: r.note ?? undefined })),
    taste: {
      tasteScores: taste.tasteScores,
      lifestyle: taste.lifestyle,
      freeText: taste.freeText,
      equipment: taste.equipment,
      preferredMethods: taste.preferredMethods,
      recentGenrePenalty: taste.recentGenrePenalty,
    },
    preferences: {
      kitchenEquipment:
        (preferences?.kitchenEquipment as string[] | undefined) ?? undefined,
      comfortableMethods:
        (preferences?.comfortableMethods as string[] | undefined) ?? undefined,
      avoidMethods: (preferences?.avoidMethods as string[] | undefined) ?? undefined,
    },
    aiMessageEnabled: Boolean(preferences?.aiMessageEnabled),
    // AIに暗黙食材リストを伝える（在庫チェック不要の食材）
    implicitIngredients: allImplicitIngredients,
  };

  return await generateMenusAgent(agentIngredients, agentContext);
}

/**
 * Generate a 7-day weekly meal plan in a SINGLE AI call
 */
export async function generateWeeklyPlanAI(
  ingredients: Ingredient[],
  preferences: UserPreferences | null,
  _expiringSoon: Ingredient[],
): Promise<unknown[]> {
  const userId = preferences?.userId;
  
  // アレルギー・制限・暗黙食材を取得
  const [allergies, restrictions] = userId ? await Promise.all([
    prisma.userAllergy.findMany({ where: { userId } }),
    prisma.userRestriction.findMany({ where: { userId } }),
  ]) : [[], []];
  
  const implicitIngredients = (preferences?.implicitIngredients as string[] | undefined) ?? [];
  const customImplicitIngredients = (preferences?.customImplicitIngredients as string[] | undefined) ?? [];
  const allImplicitIngredients = [...implicitIngredients, ...customImplicitIngredients];

  const agentIngredients = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    amount: i.amount ?? undefined,
    unit: i.unit ?? undefined,
    amountLevel: i.amountLevel ?? undefined,
    expirationDate: i.expirationDate ?? undefined,
    ingredientType:
      ((i as unknown) as {
        ingredientType?: "raw" | "processed_base" | "instant_complete";
      }).ingredientType ?? "raw",
  }));

  const taste = (preferences?.tasteJson as TasteJson | null | undefined) ?? {};
  const agentContext = {
    userId: preferences?.userId ?? "unknown",
    servings: 1,
    budget: null,
    mode: "flexible" as const,
    cookingSkill: (preferences?.cookingSkill ?? "intermediate") as
      | "beginner"
      | "intermediate"
      | "advanced",
    allergies: allergies.map((a) => a.allergen),
    restrictions: restrictions.map((r) => ({ type: r.type, note: r.note ?? undefined })),
    taste: {
      tasteScores: taste.tasteScores,
      lifestyle: taste.lifestyle,
      freeText: taste.freeText,
      equipment: taste.equipment,
      preferredMethods: taste.preferredMethods,
      recentGenrePenalty: taste.recentGenrePenalty,
    },
    preferences: {
      kitchenEquipment:
        (preferences?.kitchenEquipment as string[] | undefined) ?? undefined,
      comfortableMethods:
        (preferences?.comfortableMethods as string[] | undefined) ?? undefined,
      avoidMethods: (preferences?.avoidMethods as string[] | undefined) ?? undefined,
    },
    aiMessageEnabled: Boolean(preferences?.aiMessageEnabled),
    implicitIngredients: allImplicitIngredients,
  };

  const week = await generateWeeklyPlanAgent(agentIngredients, agentContext);
  return week as unknown[];
}

/**
 * In-memory cache for menu generation results
 * Cache key: hash of ingredients + servings + budget + mode
 */
interface MenuCacheEntry {
  ts: number;
  value: MenuGenerationResult;
}

const menuCache = new Map<string, MenuCacheEntry>();
const MENU_CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

function createMenuCacheKey(
  ingredients: IngredientWithProduct[],
  options?: { servings?: number; budget?: number | null; mode?: string },
): string {
  const ingredientHash = ingredients
    .map((i) => `${i.id}:${i.amount}:${i.expirationDate?.toISOString() ?? "none"}`)
    .sort()
    .join("|");
  return `${ingredientHash}:${options?.servings ?? 1}:${options?.budget ?? "none"}:${options?.mode ?? "flexible"}`;
}

/**
 * Generate menus with caching support
 * Uses parallel generation with in-memory caching
 */
export async function generateMenusCached(
  ingredients: IngredientWithProduct[],
  userId: string,
  options?: { servings?: number; budget?: number | null; mode?: ConstraintMode },
): Promise<{ result: MenuGenerationResult; fromCache: boolean }> {
  const cacheKey = createMenuCacheKey(ingredients, options);
  const cached = menuCache.get(cacheKey);

  if (cached && Date.now() - cached.ts < MENU_CACHE_TTL_MS) {
    console.log("[MenuCache] Cache hit for key:", cacheKey.slice(0, 50) + "...");
    return { result: cached.value, fromCache: true };
  }

  console.log("[MenuCache] Cache miss, generating menus...");
  const result = await generateMenus(ingredients, userId, options);

  menuCache.set(cacheKey, { ts: Date.now(), value: result });

  // Cleanup old entries periodically
  if (menuCache.size > 100) {
    const now = Date.now();
    for (const [key, entry] of menuCache.entries()) {
      if (now - entry.ts > MENU_CACHE_TTL_MS) {
        menuCache.delete(key);
      }
    }
  }

  return { result, fromCache: false };
}
