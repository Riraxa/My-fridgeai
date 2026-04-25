// lib/agents/fridge-agent.ts
// AI SDK 6 Fridge Agent - 冷蔵庫献立AI

import { generateObject, streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { differenceInDays, addDays, format } from 'date-fns';
import { IMPLICIT_INGREDIENTS_FOR_PROMPT } from '@/lib/constants/implicit-ingredients';
import {
  type FoodCategory,
  inferCategoryFromName,
  extractQuantityFromName,
  calculateRecommendedExpiry,
} from '@/lib/constants/food-categories';
import { NutritionCalculator } from '@/lib/nutrition/calculator';
import type { IngredientWithAmount } from '@/lib/nutrition/index';
import {
  LightMenuGenerationResultSchema,
  WeeklyMenuSchema,
  UserContextSchema,
  type IngredientInput,
  type UserContext,
  type LightMenuGenerationResult,
} from './schemas/menu';

// Legacy type for internal processing
type MenuGenerationResult = {
  main: any;
};



// デフォルトの期限閾値
const DEFAULT_CRITICAL_DAYS = 2;
const DEFAULT_WARNING_DAYS = 5;

const nutritionCalculator = new NutritionCalculator();

// --- Agents ---


/**
 * 軽量献立生成Agent (ストリーミング対応)
 * 最新 1案形式（Mainのみ）。AIが客観的にスコアを算出。
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
          ...(partial.mainPlan?.thoughtProcess || [])
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
          ...(finalObject.mainPlan?.thoughtProcess || [])
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


// --- Shared Prompt Builders ---

function buildBaseSystemPrompt(context: UserContext, critical: IngredientInput[], warning: IngredientInput[]): string {
  const implicitList = IMPLICIT_INGREDIENTS_FOR_PROMPT.join('、');
  let contextRules = "";
  if (context.mode === 'strict') {
    contextRules = `【重要】食材は手持ちリストと暗黙食材（${implicitList}）のみ使用可能です。リストにない食材（少量の薬味や調味料も含む）は一切使用しないでください。`;
  } else if (context.mode === 'quick') {
    contextRules = `【時短モード】20分以内で完成する、極めて簡潔なレシピを優先してください。`;
  } else if (context.mode === 'use-up') {
    contextRules = `【使い切りモード】賞味期限が近い食材、または余りがちな食材を大量に、または優先的に消費するレシピを提案してください。`;
  } else {
    contextRules = `手持ち食材を優先しつつ、不足食材は2品程度まで追加許可します。基本調味料は自由に使用可能です。`;
  }

  return `あなたは冷蔵庫の食材管理と献立提案を行うプロのシェフです。
ユーザー環境: 料理スキル[${context.cookingSkill}]、人数[${context.servings}人前]
制約: アレルギー[${context.allergies.join(',') || 'なし'}]
方針: ${contextRules}
【手元にある食材】
期限間近（★優先）: ${formatIngredientList(critical)}
期限間近（☆優先）: ${formatIngredientList(warning)}`;
}


function buildLightSystemPrompt(context: UserContext, critical: IngredientInput[], warning: IngredientInput[], normal: IngredientInput[]): string {
  let modeInstruction = "";
  if (context.mode === 'strict') {
    modeInstruction = `役割 (role): 'balanced' または 'creative'\n指針: 全ての料理を手持ち食材のみで完遂すること。`;
  } else if (context.mode === 'quick') {
    modeInstruction = `役割 (role): 'timeOptimized'\n指針: 合計調理時間を20分以内（目標15分）に抑えること。電子レンジ活用、ワンパン料理、同時並行調理を前提とする。`;
  } else if (context.mode === 'use-up') {
    modeInstruction = `役割 (role): 'balanced' または 'costOptimized'\n指針: 賞味期限間近の食材を最大消費しつつ、無駄なく使い切ること。`;
  } else {
    if (context.budget) {
      modeInstruction = `役割 (role): 'costOptimized'\n指針: 不足食材を2品程度まで補いつつ、予算（${context.budget}円/人）を意識した節約献立にすること。`;
    } else {
      modeInstruction = `役割 (role): 'balanced' または 'creative'\n指針: 不足食材を2品程度まで補って、魅力的な献立にすること。`;
    }
  }

  return `${buildBaseSystemPrompt(context, critical, warning)}
# 手持ち食材リスト
${formatIngredientList(normal)}

# 評価基準 (0-100)
AIが客観的に算出してください: inventoryUsage(在庫消費率), costEfficiency(節約度), healthScore(健康度), timeEfficiency(時短度)

# 提案内容 (mainPlan) の設計指針
${modeInstruction}

# 重要ルール
1. 主菜・副菜・汁物の3品すべてについて、具体的な調理手順(steps)とプロのコツ(tips)を詳しく記述してください。
2. 今回のモードの制約（strict, quick, use-up, flexible 等）をどのように満たしたかを「thoughtProcess」に箇条書きで必ず記述してください。
3. 【重要】JSONの出力順序として、必ず最初に mainPlan の thoughtProcess を出力してから、他の項目を生成してください。`;
}


function buildLightUserPrompt(ingredients: IngredientInput[], context: UserContext): string {
  return `手持ち食材: ${ingredients.map((i) => i.name).join(', ')}
狙いや工夫点（モードの制約をどう満たしたか）を「thoughtProcess」に箇条書きで含めてください。`;
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
  };
}

function logAgentExecution(name: string, start: number, critical: any[], count: number) {
  try {
    console.log(`[FridgeAgent] ${name}`, { ingredientCount: count, criticalCount: critical.length, time: Date.now() - start });
  } catch { }
}

// --- Barcode Product Inference Agent ---

export interface BarcodeProductData {
  name: string;
  brand?: string;
  image?: string;
  category?: string;
  categoryConfidence?: number;
  quantity?: string;
  amount?: number;
  unit?: string;
  recommendedExpiry?: string; // YYYY-MM-DD format
  expirySource: 'api' | 'inferred' | 'default';
}

/**
 * バーコード商品データをAI推論して冷蔵庫登録用データに変換する
 */
export async function inferBarcodeProductAgent(
  productData: {
    name: string;
    brand?: string;
    image?: string;
    category_tags?: string[];
    quantity?: string;
  }
): Promise<BarcodeProductData> {
  const startTime = Date.now();
  console.log(`[FridgeAgent] inferBarcodeProductAgent: START for "${productData.name}"`);

  // 1. ルールベースでカテゴリと数量を推測
  const { category, confidence: categoryConfidence } = inferCategoryFromName(productData.name);
  const { amount, unit } = extractQuantityFromName(productData.name);

  // 2. APIからの賞味期限情報があるか確認（Open Food Factsなど）
  let apiExpiry: string | null = null;
  if (productData.quantity) {
    // quantityフィールドに期限情報が含まれている可能性をチェック
    const dateMatch = productData.quantity.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
    if (dateMatch?.[1]) {
      apiExpiry = dateMatch[1].replace(/\//g, "-");
    }
  }

  // 3. 推奨賞味期限を計算
  const expiryDate = calculateRecommendedExpiry(category, apiExpiry);
  const expirySource: BarcodeProductData['expirySource'] = apiExpiry ? 'api' : 'inferred';

  // 4. 数量文字列を構築
  const quantityStr = amount && unit 
    ? `${amount}${unit}` 
    : (productData.quantity || '1個');

  const result: BarcodeProductData = {
    name: productData.name,
    brand: productData.brand,
    image: productData.image,
    category,
    categoryConfidence,
    quantity: quantityStr,
    amount: amount || 1,
    unit: unit || '個',
    recommendedExpiry: format(expiryDate, 'yyyy-MM-dd'),
    expirySource,
  };

  console.log(`[FridgeAgent] inferBarcodeProductAgent: COMPLETED in ${Date.now() - startTime}ms`, {
    category: result.category,
    confidence: result.categoryConfidence,
    expiry: result.recommendedExpiry,
  });

  return result;
}

/**
 * 複数商品を一括推論
 */
export async function inferMultipleBarcodeProductsAgent(
  products: Array<{
    name: string;
    brand?: string;
    image?: string;
    category_tags?: string[];
    quantity?: string;
  }>
): Promise<BarcodeProductData[]> {
  console.log(`[FridgeAgent] inferMultipleBarcodeProductsAgent: Processing ${products.length} products`);
  
  const results = await Promise.all(
    products.map(product => inferBarcodeProductAgent(product))
  );
  
  return results;
}
