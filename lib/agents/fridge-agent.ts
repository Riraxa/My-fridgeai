// lib/agents/fridge-agent.ts
// AI SDK 6 Fridge Agent - 冷蔵庫献立AI

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { differenceInDays } from 'date-fns';
import { IMPLICIT_INGREDIENTS_FOR_PROMPT } from '@/lib/constants/implicit-ingredients';
import { NutritionCalculator } from '@/lib/nutrition/calculator';
import type { IngredientWithAmount } from '@/lib/nutrition/index';
import {
  MenuGenerationResultSchema,
  WeeklyMenuSchema,
  UserContextSchema,
  type IngredientInput,
  type UserContext,
  type MenuGenerationResult,
} from './schemas/menu';

// デフォルトの期限閾値
const DEFAULT_CRITICAL_DAYS = 2;
const DEFAULT_WARNING_DAYS = 5;

const nutritionCalculator = new NutritionCalculator();

// 献立生成Agent
export async function generateMenusAgent(
  ingredients: IngredientInput[],
  userContext: UserContext,
): Promise<MenuGenerationResult> {
  const startTime = Date.now();

  // 入力検証
  const validatedContext = UserContextSchema.parse(userContext);

  // 期限間近食材の分類
  const { critical, warning, normal } = categorizeIngredientsByExpiration(
    ingredients,
    DEFAULT_CRITICAL_DAYS,
    DEFAULT_WARNING_DAYS,
  );

  // プロンプト構築
  const systemPrompt = buildSystemPrompt(
    validatedContext,
    critical,
    warning,
    normal,
  );
  const userPrompt = buildUserPrompt(ingredients, validatedContext);

  // AI SDK 6: Structured Outputで型安全に生成
  const { object: result } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: MenuGenerationResultSchema,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.7,
  });

  // 生成された献立の栄養計算
  const processedResult = await processMenuNutrition(result);

  // ログ（fire-and-forget）
  try {
    console.log('[FridgeAgent] generateMenusAgent', {
      usedIngredients: extractIngredientNames(result.main).length,
      criticalIngredients: critical.map((i) => i.name),
      generationTimeMs: Date.now() - startTime,
    });
  } catch {
    // ignore
  }

  return processedResult;
}

// 週間献立生成Agent
export async function generateWeeklyPlanAgent(
  ingredients: IngredientInput[],
  userContext: UserContext,
): Promise<MenuGenerationResult['main'][]> {
  const startTime = Date.now();

  const validatedContext = UserContextSchema.parse(userContext);

  const ingredientList = ingredients
    .map((i) => formatIngredientLine(i))
    .join('\n');

  const { object: result } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: WeeklyMenuSchema,
    system: buildWeeklySystemPrompt(validatedContext, ingredientList),
    prompt: '手持ち食材を効率よく使い切る1週間分の夕食献立を7日分作成してください。',
    temperature: 0.7,
  });

  // 栄養計算を各献立に適用
  const processedWeek = await Promise.all(
    result.week.map(async (menu) => {
      const tempResult: MenuGenerationResult = {
        main: menu,
        alternativeA: menu,
        alternativeB: menu,
      };
      const processed = await processMenuNutrition(tempResult);
      return processed.main;
    }),
  );

  // ログ（fire-and-forget）
  try {
    console.log('[FridgeAgent] generateWeeklyPlanAgent', {
      ingredientCount: ingredients.length,
      generationTimeMs: Date.now() - startTime,
    });
  } catch {
    // ignore
  }

  return processedWeek;
}

// システムプロンプト構築
function buildSystemPrompt(
  context: UserContext,
  critical: IngredientInput[],
  warning: IngredientInput[],
  normal: IngredientInput[],
): string {
  const implicitList = IMPLICIT_INGREDIENTS_FOR_PROMPT.join('、');
  
  const constraintRules = context.mode === 'strict'
    ? `# 🔒 制約モード: STRICT（完全一致）
## 絶対遵守ルール
1. 以下の2種類の食材 **のみ** 使用可能
   - **手持ち食材リスト** に記載された食材
   - **暗黙食材（基本調味料）**: ${implicitList}
2. 上記以外の食材を1つでも使用したレシピは無効
3. 上記食材だけでは作れない場合: {"error": "INSUFFICIENT_INVENTORY"}
4. 加工食品（カレールーなど）は単体でも調理成立として扱える`
    : `# 🔓 制約モード: FLEXIBLE（一部許可）
## ルール
1. 手持ち食材を最優先で使用
2. 不足食材は最大2品まで追加許可
3. 在庫外の食材は明確に区別
4. 可能な限り代替食材を提案
5. 基本調味料（${implicitList}）は自由に使用可能`;

  const allergenList = context.allergies.join(', ') || 'None';
  const restrictionNote = context.restrictions
    .map(r => `${r.type}${r.note ? `: ${r.note}` : ''}`)
    .join('; ') || 'None';

  const safetyInstructions = `# CRITICAL SAFETY RULES
1. NEVER suggest recipes containing these allergens: ${allergenList}
2. Adhere to these dietary restrictions: ${restrictionNote}
3. If ANY suggested recipe contains an allergen, response MUST include "error": "ALLERGEN_DETECTED"
4. EXTERNAL FOOD EXCLUSION: Do not suggest takeout, delivery, or prepared store-bought meals. Only suggest home-cooked recipes.`;

  const criticalList = formatIngredientList(critical, '★最優先');
  const warningList = formatIngredientList(warning, '☆優先');

  return `あなたはプロの献立プランナーです。
冷蔵庫にある食材を最大限に活用し、実用的で美味しい家庭料理の献立を提案してください。

${constraintRules}

${safetyInstructions}

# ⚠️ 最優先食材（${DEFAULT_CRITICAL_DAYS}日以内）
${criticalList}

# 優先食材（${DEFAULT_WARNING_DAYS}日以内）
${warningList}

# 手持ち食材リスト
${formatIngredientList(normal)}

# 加工食品の取り扱いルール
1. **通常食材（raw）**: 通常通り工程を記述
2. **調理ベース（processed_base）**: カレールー等。パッケージ手順に従うことを工程に含める
3. **そのまま完成（instant_complete）**: レトルト等。工程は「商品操作手順に従い準備する」

# ユーザー情報
- 料理スキル: ${context.cookingSkill}
- 人数: ${context.servings}人
${context.taste.freeText ? `- 特別指示: ${context.taste.freeText}` : ''}

# 🚨 最重要ルール
1. **食材捏造禁止** - リストにない食材は使用禁止（暗黙食材のみ例外）
2. **分量厳守** - 在庫量を超えない
3. **手順の質** - 具体的な調理手順を記述（「炒める」だけはNG）
4. **好みの分散** - 3パターン間でジャンル分散
5. **指定人数適用** - 必ず${context.servings}人前

# 提案パターン
- **main**: 栄養バランス最優先、期限間近食材を最優先消化
- **alternativeA**: mainと異なるジャンル・味付け
- **alternativeB**: 調理時間15分以内の時短献立

各献立は「主菜・副菜・汁物」の3品構成で作成。`;
}

// ユーザープロンプト構築
function buildUserPrompt(
  ingredients: IngredientInput[],
  context: UserContext,
): string {
  const tastePrefs = context.taste.tasteScores
    ? Object.entries(context.taste.tasteScores)
        .map(([k, v]) => `${k}: ${(v as number) > 0 ? '+' + v : v}`)
        .join(', ')
    : 'None';

  return `ユーザープロファイル:
- 味の好み: ${tastePrefs}
- 設備: ${context.taste.equipment?.join(', ') || '標準的なキッチン'}
- 好みの調理法: ${context.taste.preferredMethods?.join(', ') || 'None'}
- ライフスタイル: ${context.taste.lifestyle?.weekdayMode?.timePriority || 'normal'}

在庫食材（${ingredients.length}品）: ${ingredients.map(i => i.name).join(', ')}

上記のシステムプロンプトで指定されたJSON形式で、必ず "main", "alternativeA", "alternativeB" の3つの献立パターンを生成してください。
各献立は3品構成（主菜・副菜・汁物）で、栄養情報は不要（システム側で計算します）。`;
}

// 週間献立用システムプロンプト
function buildWeeklySystemPrompt(
  context: UserContext,
  ingredientList: string,
): string {
  return `あなたはプロの献立プランナーです。
冷蔵庫の食材を効率よく使い切るための「1週間分の夕食献立」を提案してください。

# 手持ち食材
${ingredientList}

# ユーザー情報
- 料理スキル: ${context.cookingSkill}
- 期限切れ間近食材優先度: 70%

# 目標
1. 7日分の献立（主菜・副菜・汁物）を一括で作成
2. 賞味期限の近い食材から順に使う計画
3. 同じ食材を使い回して無駄を防ぐ
4. 足りない食材は「買い足し」として認識

出力は必ず7日分の配列を含むJSONのみを出力してください。`;
}

// 食材を期限で分類
function categorizeIngredientsByExpiration(
  ingredients: IngredientInput[],
  criticalDays: number,
  warningDays: number,
) {
  const critical: IngredientInput[] = [];
  const warning: IngredientInput[] = [];
  const normal: IngredientInput[] = [];

  for (const i of ingredients) {
    if (!i.expirationDate) {
      normal.push(i);
      continue;
    }
    
    const days = differenceInDays(i.expirationDate, new Date());
    
    if (days >= -2 && days <= criticalDays) {
      critical.push(i);
    } else if (days > criticalDays && days <= warningDays) {
      warning.push(i);
    } else {
      normal.push(i);
    }
  }

  return { critical, warning, normal };
}

// 食材リストフォーマット
function formatIngredientList(
  ingredients: IngredientInput[],
  suffix = '',
): string {
  if (ingredients.length === 0) return 'なし';
  
  return ingredients
    .map(i => {
      let line = `- ${i.name}`;
      if (i.amount) line += ` (${i.amount}${i.unit || ''})`;
      if (i.expirationDate) {
        const days = differenceInDays(i.expirationDate, new Date());
        line += ` [期限まで${days}日]`;
      }
      if (i.ingredientType !== 'raw') {
        const typeLabel = i.ingredientType === 'processed_base' 
          ? ' 【加工:調理ベース】'
          : ' 【加工:そのまま完成】';
        line += typeLabel;
      }
      if (suffix) line += ` ${suffix}`;
      return line;
    })
    .join('\n');
}

// 単一行フォーマット
function formatIngredientLine(i: IngredientInput): string {
  let line = `- ${i.name}`;
  if (i.amount) line += ` (${i.amount}${i.unit || ''})`;
  if (i.expirationDate) {
    const days = differenceInDays(i.expirationDate, new Date());
    line += ` [期限まで${days}日]`;
  }
  return line;
}

// 栄養計算を献立に適用
async function processMenuNutrition(
  result: MenuGenerationResult,
): Promise<MenuGenerationResult> {
  const processMenu = async (menu: MenuGenerationResult['main']) => {
    if (!menu.dishes) return menu;

    const processedDishes = await Promise.all(
      menu.dishes.map(async (dish) => {
        if (!dish.ingredients?.length) {
          return { ...dish, nutrition: { calories: 0, protein: 0, fat: 0, carbs: 0, salt: 0 } };
        }

        const ingredientAmounts: IngredientWithAmount[] = dish.ingredients.map(
          (ing) => ({
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
          }),
        );

        try {
          const nutrition =
            await nutritionCalculator.calculateFromIngredients(ingredientAmounts);

          return {
            ...dish,
            nutrition: {
              calories: nutrition.calories,
              protein: nutrition.protein,
              fat: nutrition.fat,
              carbs: nutrition.carbs,
              salt: nutrition.salt ?? 0,
            },
          };
        } catch (e) {
          console.warn('[Nutrition] 計算エラー:', e);
          return {
            ...dish,
            nutrition: { calories: 0, protein: 0, fat: 0, carbs: 0, salt: 0 },
          };
        }
      }),
    );

    return { ...menu, dishes: processedDishes };
  };

  return {
    main: await processMenu(result.main),
    alternativeA: await processMenu(result.alternativeA),
    alternativeB: await processMenu(result.alternativeB),
  };
}

// 献立から食材名を抽出
function extractIngredientNames(menu: MenuGenerationResult['main']): string[] {
  const names: string[] = [];
  menu.dishes?.forEach(dish => {
    dish.ingredients?.forEach(ing => {
      if (!names.includes(ing.name)) names.push(ing.name);
    });
  });
  return names;
}
