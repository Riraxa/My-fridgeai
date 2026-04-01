// lib/agents/schemas/menu.ts
// AI SDK 6用のZodスキーマ定義

import { z } from 'zod';

// 食材情報
export const IngredientSchema = z.object({
  name: z.string(),
  amount: z.number(),
  unit: z.string(),
});

// 料理情報
export const DishSchema = z.object({
  type: z.enum(['主菜', '副菜', '汁物']),
  name: z.string(),
  cookingTime: z.number().min(1).max(120),
  difficulty: z.number().min(1).max(5),
  ingredients: z.array(IngredientSchema),
  steps: z.array(z.string()).min(1),
  tips: z.string(),
});

// 献立（単体）
export const MenuSchema = z.object({
  title: z.string(),
  reason: z.string(),
  tags: z.array(z.string()),
  dishes: z.array(DishSchema).length(3, '主菜・副菜・汁物の3品必須'),
});

// 3パターンの献立
export const MenuGenerationResultSchema = z.object({
  main: MenuSchema.describe('メイン提案：最も栄養バランスが良く期限間近食材を最優先で消化'),
  alternativeA: MenuSchema.describe('代替案A：mainとは異なるジャンル・味付け'),
  alternativeB: MenuSchema.describe('代替案B：調理時間15分以内の時短献立'),
});

// 週間献立
export const WeeklyMenuSchema = z.object({
  week: z.array(MenuSchema).length(7, '7日分必須'),
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
  mode: z.enum(['strict', 'flexible']).default('flexible'),
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
  }).default({}),
  preferences: z.object({
    kitchenEquipment: z.array(z.string()).optional(),
    comfortableMethods: z.array(z.string()).optional(),
    avoidMethods: z.array(z.string()).optional(),
  }).optional(),
  aiMessageEnabled: z.boolean().default(false),
});

// 型定義
export type IngredientInput = z.infer<typeof InputIngredientSchema>;
export type UserContext = z.infer<typeof UserContextSchema>;
export type MenuGenerationResult = z.infer<typeof MenuGenerationResultSchema>;
export type GeneratedMenu = z.infer<typeof MenuSchema>;
export type GeneratedDish = z.infer<typeof DishSchema>;
