// lib/agents/fridge-agent.ts
// AI SDK 6 Fridge Agent - 冷蔵庫献立AI

import { generateObject, streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { differenceInDays } from 'date-fns';
import { IMPLICIT_INGREDIENTS_FOR_PROMPT } from '@/lib/constants/implicit-ingredients';
import { NutritionCalculator } from '@/lib/nutrition/calculator';
import type { IngredientWithAmount } from '@/lib/nutrition/index';
import {
  MenuGenerationResultSchema,
  LightMenuGenerationResultSchema,
  WeeklyMenuSchema,
  UserContextSchema,
  type IngredientInput,
  type UserContext,
  type MenuGenerationResult,
  type LightMenuGenerationResult,
} from './schemas/menu';

export {
  MenuGenerationResultSchema,
  LightMenuGenerationResultSchema,
  WeeklyMenuSchema,
  UserContextSchema,
  type IngredientInput,
  type UserContext,
  type MenuGenerationResult,
  type LightMenuGenerationResult,
};

// デフォルトの期限閾値
const DEFAULT_CRITICAL_DAYS = 2;
const DEFAULT_WARNING_DAYS = 5;

const nutritionCalculator = new NutritionCalculator();

// --- Agents ---

/**
 * 献立生成Agent (標準版)
 */
export async function generateMenusAgent(
  ingredients: IngredientInput[],
  userContext: UserContext,
): Promise<MenuGenerationResult> {
  const startTime = Date.now();
  const validatedContext = UserContextSchema.parse(userContext);
  const { critical, warning, normal } = categorizeIngredientsByExpiration(ingredients);

  const systemPrompt = buildSystemPrompt(validatedContext, critical, warning, normal);
  const userPrompt = buildUserPrompt(ingredients, validatedContext);

  // タイムアウト設定 (45秒)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: MenuGenerationResultSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxOutputTokens: 2500,
      abortSignal: controller.signal,
    });

    const processedResult = await processMenuNutrition(object);
    logAgentExecution('generateMenusAgent', startTime, critical, extractIngredientNames(object.main).length);
    return processedResult;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 軽量献立生成Agent (ストリーミング対応)
 * 最新 2案（Main & Alternative）比較形式。AIが客観的にスコアを算出。
 * SSoT（Single Source of Truth）版: 最初から手順(steps)とコツ(tips)を含めて生成します。
 */
export async function generateLightMenusAgent(
  ingredients: IngredientInput[],
  userContext: UserContext,
  onThoughtsUpdate?: (thoughts: string[]) => void,
): Promise<LightMenuGenerationResult> {
  const startTime = Date.now();
  console.log(`[FridgeAgent] generateLightMenusAgent: START (userId: ${userContext.userId})`);
  const validatedContext = UserContextSchema.parse(userContext);
  const { critical, warning, normal } = categorizeIngredientsByExpiration(ingredients);

  const systemPrompt = buildLightSystemPrompt(validatedContext, critical, warning, normal);
  const userPrompt = buildLightUserPrompt(ingredients, validatedContext);

  // タイムアウト設定 (90秒に延長)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    if (onThoughtsUpdate) {
      console.log(`[FridgeAgent] streamObject: Initiating AI stream...`);
      const streamResult = await streamObject({
        model: openai('gpt-4o-mini'),
        schema: LightMenuGenerationResultSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.7,
        maxOutputTokens: 6000,
        abortSignal: controller.signal,
      });

      let lastUpdateAt = 0;
      for await (const partial of streamResult.partialObjectStream) {
        const thoughts = [
          ...(partial.mainPlan?.thoughtProcess || []),
          ...(partial.alternativePlan?.thoughtProcess || [])
        ].filter((t): t is string => typeof t === 'string' && t.trim().length > 0);

        const now = Date.now();
        if (onThoughtsUpdate && (now - lastUpdateAt > 400)) { // 400msごとにDB更新
          onThoughtsUpdate(thoughts);
          lastUpdateAt = now;
        }
      }

      console.log(`[FridgeAgent] streamObject: AI Stream COMPLETED. Waiting for final object...`);
      const finalObject = await streamResult.object;
      
      // 最後にすべての思考を確実に送信
      if (onThoughtsUpdate) {
        const finalThoughts = [
          ...(finalObject.mainPlan?.thoughtProcess || []),
          ...(finalObject.alternativePlan?.thoughtProcess || [])
        ].filter(t => t && t.trim().length > 0);
        onThoughtsUpdate(finalThoughts);
      }

      console.log(`[FridgeAgent] streamObject: Final object received (mainPlan: ${finalObject.mainPlan?.name})`);
      logAgentExecution('generateFullMenusAgent (stream)', startTime, critical, 0);
      return finalObject;
    }

    console.log(`[FridgeAgent] generateObject: Running non-streaming generation...`);
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: LightMenuGenerationResultSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxOutputTokens: 6000,
      abortSignal: controller.signal,
    });

    console.log(`[FridgeAgent] generateObject: COMPLETED (mainPlan: ${object.mainPlan?.name})`);
    logAgentExecution('generateFullMenusAgent', startTime, critical, 0);
    return object;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`[FridgeAgent] AI Generation TIMEOUT after ${Date.now() - startTime}ms`);
    } else {
      console.error(`[FridgeAgent] AI Generation ERROR:`, error);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 週間献立生成Agent
 */
export async function generateWeeklyPlanAgent(
  ingredients: IngredientInput[],
  userContext: UserContext,
): Promise<any[]> {
  const startTime = Date.now();
  const validatedContext = UserContextSchema.parse(userContext);
  const ingredientList = ingredients.map((i) => formatIngredientLine(i)).join('\n');

  // タイムアウト設定 (45秒)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: WeeklyMenuSchema,
      system: buildWeeklySystemPrompt(validatedContext, ingredientList),
      prompt: '手持ち食材を効率よく使い切る1週間分の夕食献立を7日分作成してください。',
      temperature: 0.7,
      maxOutputTokens: 6000,
      abortSignal: controller.signal,
    });

    const processedWeek = await Promise.all(
      object.week.map(async (menu: any) => {
        const tempResult: MenuGenerationResult = {
          main: menu,
          alternativeA: menu, // Dummy for nutrition processing
          alternativeB: menu,
        };
        const processed = await processMenuNutrition(tempResult);
        return processed.main;
      }),
    );

    return processedWeek;
  } finally {
    clearTimeout(timeoutId);
  }
}

// 別名定義
export const generateLightMenusAgentStream = generateLightMenusAgent;

// --- Shared Prompt Builders ---

function buildBaseSystemPrompt(context: UserContext, critical: IngredientInput[], warning: IngredientInput[]): string {
  const implicitList = IMPLICIT_INGREDIENTS_FOR_PROMPT.join('、');
  const contextRules = context.mode === 'strict'
    ? `【重要】食材は手持ちリストと暗黙食材（${implicitList}）のみ使用可能です。リストにない食材（少量の薬味や調味料も含む）は一切使用しないでください。`
    : `手持ち食材を優先しつつ、不足食材は2品程度まで追加許可します。基本調味料は自由に使用可能です。`;

  return `あなたは冷蔵庫の食材管理と献立提案を行うプロのシェフです。
ユーザー環境: 料理スキル[${context.cookingSkill}]、人数[${context.servings}人前]
制約: アレルギー[${context.allergies.join(',') || 'なし'}]
方針: ${contextRules}
【手元にある食材】
期限間近（★優先）: ${formatIngredientList(critical)}
期限間近（☆優先）: ${formatIngredientList(warning)}`;
}

function buildSystemPrompt(context: UserContext, critical: IngredientInput[], warning: IngredientInput[], normal: IngredientInput[]): string {
  return `${buildBaseSystemPrompt(context, critical, warning)}
# 手持ち食材リスト
${formatIngredientList(normal)}`;
}

function buildLightSystemPrompt(context: UserContext, critical: IngredientInput[], warning: IngredientInput[], normal: IngredientInput[]): string {
  return `${buildBaseSystemPrompt(context, critical, warning)}
# 手持ち食材リスト
${formatIngredientList(normal)}

# 評価基準 (0-100)
AIが客観的に算出してください: inventoryUsage(在庫消費率), costEfficiency(節約度), healthScore(健康度), timeEfficiency(時短度)

# 2案の役割と設計指針
1. mainPlan (バランス案):
   - 30〜45分程度かけ、食材の旨味を最大限に引き出す丁寧な構成。
   - 期限間近食材を論理的に使い切ることを最優先する。
2. alternativePlan (特化案):
   - 【時短特化 (timeOptimized)】の場合: **合計調理時間を20分以内（目標15分）**に抑えること。電子レンジ活用、ワンパン料理、同時並行調理を前提とする。
   - 【節約/健康/過激】の場合: 各テーマのメリットが極大化されるよう、通常案とは明確に異なるアプローチを取る。

# 重要ルール
1. **2案の合計調理時間に少なくとも15分以上の差をつけてください。**（例: 45分 vs 20分）
2. 主菜・副菜・汁物の3品すべてについて、具体的な調理手順(steps)とプロのコツ(tips)を詳しく記述してください。
3. thoughtsProcessを各案の最初に出力。`;
}

function buildUserPrompt(ingredients: IngredientInput[], context: UserContext): string {
  return `手持ち食材: ${ingredients.map((i) => i.name).join(', ')}`;
}

function buildLightUserPrompt(ingredients: IngredientInput[], context: UserContext): string {
  return `${buildUserPrompt(ingredients, context)}
各案の狙いや工夫点を「thoughtProcess」に箇条書きで含めてください。
**時短特化案（timeOptimized）については、合計20分以内で終わる極めて現実的な工程を提案してください。**
通常案の調理時間との間に15分以上の明確な差をつけてください。 (例: 通常45分 / 時短20分)`;
}

function buildWeeklySystemPrompt(context: UserContext, list: string): string {
  return `プロの献立プランナーとして、以下の食材を1週間で使い切るプランを作成してください。\n${list}`;
}

// --- Helpers ---

// handlePartialThoughts はインライン化されたため削除

function categorizeIngredientsByExpiration(ingredients: IngredientInput[]) {
  const critical: IngredientInput[] = [], warning: IngredientInput[] = [], normal: IngredientInput[] = [];
  const now = new Date();
  ingredients.forEach(i => {
    if (!i.expirationDate) { normal.push(i); return; }
    const days = differenceInDays(i.expirationDate, now);
    if (days <= DEFAULT_CRITICAL_DAYS) critical.push(i);
    else if (days <= DEFAULT_WARNING_DAYS) warning.push(i);
    else normal.push(i);
  });
  return { critical, warning, normal };
}

function formatIngredientList(ingredients: IngredientInput[]): string {
  if (ingredients.length === 0) return 'なし';
  return ingredients.map(i => `- ${i.name}${i.amount ? ` (${i.amount}${i.unit || ''})` : ''}`).join('\n');
}

function formatIngredientLine(i: IngredientInput): string {
  return `- ${i.name}${i.amount ? ` (${i.amount}${i.unit || ''})` : ''}${i.expirationDate ? ` [期限:${differenceInDays(i.expirationDate, new Date())}日]` : ''}`;
}

function extractIngredientNames(menu: any): string[] {
  const names: string[] = [];
  menu.dishes?.forEach((d: any) => d.ingredients?.forEach((ing: any) => { if (!names.includes(ing.name)) names.push(ing.name); }));
  return names;
}

async function processMenuNutrition(result: MenuGenerationResult): Promise<MenuGenerationResult> {
  const process = async (menu: any) => {
    if (!menu.dishes) return menu;
    const dishes = await Promise.all(menu.dishes.map(async (dish: any) => {
      if (!dish.ingredients?.length) return { ...dish, nutrition: { calories: 0, protein: 0, fat: 0, carbs: 0, salt: 0 } };
      try {
        const n = await nutritionCalculator.calculateFromIngredients(dish.ingredients.map((ing: any) => ({ name: ing.name, amount: ing.amount, unit: ing.unit })));
        return { ...dish, nutrition: { calories: n.calories, protein: n.protein, fat: n.fat, carbs: n.carbs, salt: n.salt ?? 0 } };
      } catch { return dish; }
    }));
    return { ...menu, dishes };
  };
  return {
    main: await process(result.main),
    alternativeA: await process(result.alternativeA),
    alternativeB: await process(result.alternativeB),
  };
}

function logAgentExecution(name: string, start: number, critical: any[], count: number) {
  try {
    console.log(`[FridgeAgent] ${name}`, { ingredientCount: count, criticalCount: critical.length, time: Date.now() - start });
  } catch { }
}
