// lib/agents/tools/index.ts
// AI SDK 6 Tool定義

import { tool } from 'ai';
import { z } from 'zod';
import { NutritionCalculator } from '@/lib/nutrition/calculator';
import { checkAllergens as checkAllergensUtil } from '@/lib/ai/allergen-checker';
import type { IngredientWithAmount } from '@/lib/nutrition/index';

const nutritionCalculator = new NutritionCalculator();

// 栄養計算Tool
export const calculateNutritionTool = tool({
  description: '料理の栄養価を食材情報から計算します。AIが生成した料理に対して、ローカルDBから栄養データを計算します。',
  inputSchema: z.object({
    dishName: z.string().describe('料理名'),
    ingredients: z.array(z.object({
      name: z.string(),
      amount: z.number(),
      unit: z.string(),
    })).describe('食材リスト（AI生成した分量）'),
  }),
  execute: async ({ dishName, ingredients }) => {
    try {
      const ingredientAmounts: IngredientWithAmount[] = ingredients.map(ing => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
      }));

      const nutrition = await nutritionCalculator.calculateFromIngredients(ingredientAmounts);
      
      return {
        success: true,
        dishName,
        nutrition: {
          calories: nutrition.calories,
          protein: nutrition.protein,
          fat: nutrition.fat,
          carbs: nutrition.carbs,
          salt: nutrition.salt ?? 0,
        },
      };
    } catch (error) {
      console.warn('[Nutrition Tool] 計算エラー:', error);
      return {
        success: false,
        dishName,
        error: '栄養計算に失敗しました',
        nutrition: { calories: 0, protein: 0, fat: 0, carbs: 0, salt: 0 },
      };
    }
  },
});

// アレルギーチェックTool（承認が必要）
export const checkAllergensTool = tool({
  description: '提案された食材にアレルギー物質が含まれているかチェックします。危険な場合は承認を要求します。',
  inputSchema: z.object({
    ingredients: z.array(z.string()).describe('チェックする食材名リスト'),
    userAllergens: z.array(z.string()).describe('ユーザーのアレルギーリスト'),
    context: z.string().optional().describe('コンテキスト（献立名など）'),
  }),
  // アレルギー検出時は承認を要求
  needsApproval: async ({ ingredients, userAllergens }) => {
    const result = checkAllergensUtil(ingredients, userAllergens);
    return result !== null; // アレルギーが検出された場合のみ承認要求
  },
  execute: async ({ ingredients, userAllergens, context }) => {
    const result = checkAllergensUtil(ingredients, userAllergens);
    
    if (result) {
      return {
        safe: false,
        detectedAllergen: result.allergen,
        foundIn: result.foundIn,
        context,
        message: `⚠️ アレルギー物質「${result.allergen}」が「${result.foundIn}」に含まれています`,
      };
    }
    
    return {
      safe: true,
      ingredients: ingredients.length,
      allergens: userAllergens.length,
      message: '✅ アレルギーチェック完了：安全です',
    };
  },
});

// 食材使用確認Tool（デバッグ用）
export const logIngredientUsageTool = tool({
  description: '献立で使用された食材をログに記録します。分析・改善のためのデータ収集に使用します。',
  inputSchema: z.object({
    menuType: z.enum(['main', 'alternativeA', 'alternativeB']).describe('献立タイプ'),
    usedIngredients: z.array(z.string()).describe('使用した食材名リスト'),
    criticalIngredients: z.array(z.string()).optional().describe('期限間近食材リスト'),
    generationTime: z.number().describe('生成にかかった時間(ms)'),
  }),
  execute: async ({ menuType, usedIngredients, criticalIngredients, generationTime }) => {
    console.log('[AI Agent] 献立生成完了:', {
      menuType,
      usedIngredients: usedIngredients.length,
      criticalIngredientsUsed: criticalIngredients?.filter(i => usedIngredients.includes(i)).length ?? 0,
      generationTime: `${generationTime}ms`,
    });
    
    return {
      logged: true,
      timestamp: new Date().toISOString(),
    };
  },
});

// Tool一覧
export const fridgeTools = {
  calculateNutrition: calculateNutritionTool,
  checkAllergens: checkAllergensTool,
  logIngredientUsage: logIngredientUsageTool,
};
