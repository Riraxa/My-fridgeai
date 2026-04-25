// lib/agents/schemas/menu.ts
// AI SDK 6用のZodスキーマ定義

import { z } from 'zod';

// 食材情報
export const IngredientSchema = z.object({
  name: z.string(),
  amount: z.number(),
  unit: z.string(),
});


// スコア情報（0-100）- 先に定義
export const PlanScoresSchema = z.object({
  inventoryUsage: z.number().min(0).max(100).describe('在庫消費率: 手持ち食材の効率的活用度'),
  costEfficiency: z.number().min(0).max(100).describe('節約度: コスト効率の良さ'),
  healthScore: z.number().min(0).max(100).describe('健康度: 栄養バランスの良さ'),
  timeEfficiency: z.number().min(0).max(100).describe('時短度: 調理時間の短さ'),
});

// 軽量サジェスト - 先に定義
export const LightSuggestionSchema = z.object({
  text: z.string().describe('サジェストテキスト（例: "鶏胸肉のレモンソテー"）'),
  label: z.enum(['時短', '節約', '創作', '健康', '簡単']).describe('カテゴリラベル'),
  confidence: z.number().min(0).max(1).describe('AIの確信度'),
  hint: z.string().describe('追加のヒント'),
});

// 比較情報 - 廃止（1案出力に変更したため）
// export const PlanComparisonSchema は削除されます

// 料理情報（完全版 - steps/tips含む）
export const DishSchema = z.object({
  type: z.enum(['主菜', '副菜', '汁物']),
  name: z.string(),
  cookingTime: z.number().min(1).max(120),
  difficulty: z.number().min(1).max(5),
  ingredients: z.array(IngredientSchema),
  steps: z.array(z.string()).min(1),
  tips: z.string(),
  nutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    fat: z.number(),
    carbs: z.number(),
  }).describe('1人前あたりの栄養情報'),
});

// 献立（完全版）- 2案形式
export const LightMenuSchema = z.object({
  thoughtProcess: z.array(z.string()).describe('献立の狙いや工夫点'),
  name: z.string().describe('献立のタイトル'),
  description: z.string().describe('献立の全体的な魅力や理由'),
  tags: z.array(z.string()),
  dishes: z.array(DishSchema).length(3, '主菜・副菜・汁物の3品必須'),
  role: z.enum(['balanced', 'timeOptimized', 'costOptimized', 'healthOptimized', 'creative']).describe('この案の役割（モードや予算設定に応じた主要目的）'),
  scores: PlanScoresSchema.describe('この案の推定スコア（0-100）'),
  specializationReason: z.string().describe('特化方向の説明（例: "手持ち食材のみで完遂できる節約献立"）'),
});

// 軽量献立生成結果（1案出力に変更）
export const LightMenuGenerationResultSchema = z.object({
  mainPlan: LightMenuSchema.describe('提案される最適案：ユーザーの指定モードや在庫状況に基づく最適な献立'),
});

const WeeklyDayPlanSchema = z.object({
  title: z.string(),
  reason: z.string(),
  tags: z.array(z.string()),
  dishes: z.array(DishSchema).length(3, '主菜・副菜・汁物の3品必須'),
});

// 週間献立
export const WeeklyMenuSchema = z.object({
  week: z.array(WeeklyDayPlanSchema).length(7, '7日分必須'),
});

// 食材情報（入力用）
export const InputIngredientSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  amount: z.number().optional(),
  unit: z.string().optional(),
  amountLevel: z.string().optional(),
  expirationDate: z.date().optional(),
  ingredientType: z.enum(['raw', 'processed_base', 'instant_complete']).default('raw'),
});

// ユーザープレファレンス（入力用）
export const UserContextSchema = z.object({
  userId: z.string(),
  servings: z.number().default(1),
  budget: z.number().nullable().optional(),
  mode: z.enum(['strict', 'flexible', 'quick', 'use-up']).default('flexible'),
  cookingSkill: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  allergies: z.array(z.string()).default([]),
  restrictions: z.array(z.object({
    type: z.string(),
    note: z.string().optional(),
  })).default([]),
  taste: z.object({
    tasteScores: z.record(z.string(), z.number()).optional(),
    lifestyle: z.object({
      weekdayMode: z.object({
        timePriority: z.string().optional(),
        dishwashingAvoid: z.boolean().optional(),
        singlePan: z.boolean().optional(),
      }).optional(),
      weekendMode: z.object({
        timePriority: z.string().optional(),
        dishwashingAvoid: z.boolean().optional(),
        singlePan: z.boolean().optional(),
      }).optional(),
      defaultMode: z.object({
        timePriority: z.string().optional(),
        dishwashingAvoid: z.boolean().optional(),
        singlePan: z.boolean().optional(),
      }).optional(),
    }).optional(),
    freeText: z.string().optional(),
    equipment: z.array(z.string()).optional(),
    preferredMethods: z.array(z.string()).optional(),
    recentGenrePenalty: z.record(z.string(), z.number()).optional(),
    // 3軸嗜好データ
    profile: z.object({
      favoriteIngredients: z.array(z.string()).optional(),
      dislikedIngredients: z.array(z.string()).optional(),
      ingredientScores: z.record(z.string(), z.number()).optional(),
      favoriteDishes: z.array(z.string()).optional(),
      dislikedDishes: z.array(z.string()).optional(),
      dishScores: z.record(z.string(), z.number()).optional(),
      favoriteMethods: z.array(z.string()).optional(),
      dislikedMethods: z.array(z.string()).optional(),
      methodScores: z.record(z.string(), z.number()).optional(),
    }).optional(),
  }).default({}),
  preferences: z.object({
    kitchenEquipment: z.array(z.string()).optional(),
    comfortableMethods: z.array(z.string()).optional(),
    avoidMethods: z.array(z.string()).optional(),
  }).optional(),
  aiMessageEnabled: z.boolean().default(false),
  implicitIngredients: z.array(z.string()).default([]),
});


export type PlanScores = z.infer<typeof PlanScoresSchema>;
export type LightSuggestion = z.infer<typeof LightSuggestionSchema>;

// 型定義（後方互換性用）
export type IngredientInput = z.infer<typeof InputIngredientSchema>;
export type UserContext = z.infer<typeof UserContextSchema>;
export type GeneratedDish = z.infer<typeof DishSchema>;

// 軽量版型定義（コスト削減用）
export type LightMenu = z.infer<typeof LightMenuSchema>;
export type LightMenuGenerationResult = z.infer<typeof LightMenuGenerationResultSchema>;
export type WeeklyDayPlanEntry = z.infer<typeof WeeklyDayPlanSchema>;
