/**
 * 機能: 献立スコア計算モジュール（非同期・バッチ対応）
 * 目的: サーバー側で決定的なスコアを計算し、AIスコアを置き換える
 * 非目的: AIベースの推定、機械学習モデル
 * 変更方針: 破壊的変更禁止 / 段階導入 / 型安全必須
 * セキュリティ: PII最小化 / 計算ロジックの固定化
 *
 * アーキテクチャ:
 * - calculateScores(menuGenerationId): 単一献立のスコア計算（async）
 * - calculateScoresBatch(ids[]): 複数献立のバッチ計算（future）
 * - 各サブスコアは独立して計算可能
 */

import { prisma } from "@/lib/prisma";
import { normalizeIngredientKey } from "@/lib/taste/normalizeIngredientKey";

// ============================================================================
// 型定義
// ============================================================================

export interface MenuScores {
  inventoryUsageRate: number; // 0.0 - 1.0
  costEfficiencyScore: number; // 0 - 100
  healthScore: number; // 0 - 100
  totalScore: number; // 0 - 100
  scoreVersion: string;
}

export interface ScoreCalculationInput {
  menuGenerationId: string;
  mainMenu: unknown;
  alternativeA: unknown;
  alternativeB: unknown;
  usedIngredients: unknown;
  nutritionInfo: unknown;
  inventoryIngredients: Array<{
    id: string;
    name: string;
    amount?: number | null;
    amountLevel?: string | null;
    expirationDate?: Date | null;
  }>;
}

export interface BatchScoreResult {
  menuGenerationId: string;
  scores: MenuScores | null;
  error?: string;
}

// スコア計算の重み設定
const SCORE_WEIGHTS = {
  inventoryUsage: 0.4, // 40%
  costEfficiency: 0.3, // 30%
  health: 0.3, // 30%
};

// ============================================================================
// メインエントリポイント
// ============================================================================

/**
 * 単一献立のスコアを計算する（async対応）
 * 将来的に非同期ジョブキューから呼び出し可能な構造
 *
 * @param menuGenerationId - 計算対象の献立生成ID
 * @returns 計算されたスコア、またはnull（エラー時）
 */
export async function calculateScores(
  menuGenerationId: string,
): Promise<MenuScores | null> {
  try {
    // 1. 入力データ取得
    const input = await fetchCalculationInput(menuGenerationId);
    if (!input) {
      console.error(`[ScoreCalc] MenuGeneration not found: ${menuGenerationId}`);
      return null;
    }

    // 2. 各スコアを並列計算
    const [inventoryUsageRate, costEfficiencyScore, healthScore] =
      await Promise.all([
        calculateInventoryUsageRate(input),
        calculateCostEfficiencyScore(input),
        calculateHealthScore(input),
      ]);

    // 3. 総合スコア計算
    const totalScore = Math.round(
      inventoryUsageRate * SCORE_WEIGHTS.inventoryUsage * 100 +
        (costEfficiencyScore / 100) * SCORE_WEIGHTS.costEfficiency * 100 +
        (healthScore / 100) * SCORE_WEIGHTS.health * 100,
    );

    const scores: MenuScores = {
      inventoryUsageRate: Math.round(inventoryUsageRate * 100) / 100, // 小数点2位まで
      costEfficiencyScore,
      healthScore,
      totalScore: Math.max(0, Math.min(100, totalScore)),
      scoreVersion: "v1.0",
    };

    // 4. DBに保存（非同期で実行、失敗してもreturnはする）
    await saveScores(menuGenerationId, scores).catch((err) => {
      console.error(`[ScoreCalc] Failed to save scores: ${err}`);
    });

    return scores;
  } catch (error) {
    console.error(`[ScoreCalc] Error calculating scores: ${error}`);
    return null;
  }
}

/**
 * 複数献立のスコアをバッチ計算する（将来的な拡張用）
 * 将来的にジョブキュー（Bull/BullMQ等）から呼び出される想定
 *
 * @param menuGenerationIds - 計算対象の献立生成ID配列
 * @returns 各献立の計算結果
 */
export async function calculateScoresBatch(
  menuGenerationIds: string[],
): Promise<BatchScoreResult[]> {
  const results: BatchScoreResult[] = [];

  // 逐次処理（並列度制御のため）
  // 将来的にp-limit等で並列度を制御
  for (const id of menuGenerationIds) {
    try {
      const scores = await calculateScores(id);
      results.push({ menuGenerationId: id, scores });
    } catch (error) {
      results.push({
        menuGenerationId: id,
        scores: null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

// ============================================================================
// サブスコア計算関数
// ============================================================================

/**
 * 在庫消費率を計算（0.0 - 1.0）
 * 使用食材数 / 在庫総数 + 賞味期限ボーナス
 */
async function calculateInventoryUsageRate(
  input: ScoreCalculationInput,
): Promise<number> {
  const { inventoryIngredients, usedIngredients } = input;

  // 在庫がない場合は0
  if (!inventoryIngredients || inventoryIngredients.length === 0) {
    return 0;
  }

  // usedIngredientsの構造を解析
  const used = parseUsedIngredients(usedIngredients);

  // 在庫食材名を正規化してセット化
  const inventoryKeys = new Set(
    inventoryIngredients.map((ing) => normalizeIngredientKey(ing.name)),
  );

  // 使用された食材キーを正規化
  const usedKeys = new Set(used.map((name) => normalizeIngredientKey(name)));

  // 使用食材数 / 在庫総数（重複除去済み）
  const uniqueInventoryCount = inventoryKeys.size;
  const uniqueUsedCount = Array.from(usedKeys).filter((key) =>
    inventoryKeys.has(key),
  ).length;

  let baseRate =
    uniqueInventoryCount > 0 ? uniqueUsedCount / uniqueInventoryCount : 0;

  // 賞味期限が近い食材のボーナス
  const expiringBonus = calculateExpiringBonus(
    inventoryIngredients,
    usedKeys,
  );

  // 最終スコア（最大1.0）
  const finalRate = Math.min(1.0, baseRate + expiringBonus);

  return finalRate;
}

/**
 * 節約度スコアを計算（0 - 100）
 * 在庫活用度70% + 低価格食材優先度30%
 */
async function calculateCostEfficiencyScore(
  input: ScoreCalculationInput,
): Promise<number> {
  const { inventoryIngredients, mainMenu } = input;

  // 献立から食材リストを抽出
  const menuIngredients = extractIngredientsFromMenu(mainMenu);

  // 在庫に含まれる食材の割合
  const inventoryKeys = new Set(
    inventoryIngredients.map((ing) => normalizeIngredientKey(ing.name)),
  );

  const usedFromInventory = menuIngredients.filter((name) =>
    inventoryKeys.has(normalizeIngredientKey(name)),
  ).length;

  const totalMenuIngredients = menuIngredients.length || 1;
  const inventoryRatio = usedFromInventory / totalMenuIngredients;

  // 高価食材の判定（簡易的なリスト）
  const expensiveIngredients = [
    "牛肉",
    "牛バラ",
    "牛ロース",
    "サーロイン",
    "ヒレ",
    "フォアグラ",
    "キャビア",
    "トリュフ",
    "伊勢海老",
    "アワビ",
    "フカヒレ",
    "ウニ",
    "クロマグロ",
    "大トロ",
    "中トロ",
  ];

  const expensiveCount = menuIngredients.filter((name) => {
    const normalized = normalizeIngredientKey(name);
    return expensiveIngredients.some((exp) => normalized.includes(exp));
  }).length;

  // 高価食材比率（低いほど良い）
  const expensiveRatio = expensiveCount / totalMenuIngredients;
  const lowCostBonus = (1 - expensiveRatio) * 30; // 30点満点

  // 最終スコア: 在庫活用70点満点 + 低価格ボーナス30点満点
  const score = Math.round(inventoryRatio * 70 + lowCostBonus);

  return Math.max(0, Math.min(100, score));
}

/**
 * 健康度スコアを計算（0 - 100）
 * PFCバランス + 野菜量 + 加工食品ペナルティ
 */
async function calculateHealthScore(
  input: ScoreCalculationInput,
): Promise<number> {
  const { nutritionInfo, mainMenu } = input;

  // 栄養情報がない場合はデフォルト値
  if (!nutritionInfo) {
    return 50; // 中央値
  }

  const nutrition = parseNutritionInfo(nutritionInfo);

  if (!nutrition || !nutrition.total) {
    return 50;
  }

  const { calories, protein, fat, carbs } = nutrition.total;

  // カロリーが0または異常値の場合
  if (!calories || calories <= 0) {
    return 50;
  }

  // PFCバランス計算
  const proteinRatio = (protein * 4) / calories; // タンパク質のカロリー比率
  const fatRatio = (fat * 9) / calories; // 脂質のカロリー比率
  const carbsRatio = (carbs * 4) / calories; // 炭水化物のカロリー比率

  // 理想的なPFCバランス: P:25% F:30% C:45%
  const idealProtein = 0.25;
  const idealFat = 0.3;
  const idealCarbs = 0.45;

  // 偏差計算（小さいほど良い）
  const deviation =
    Math.abs(proteinRatio - idealProtein) +
    Math.abs(fatRatio - idealFat) +
    Math.abs(carbsRatio - idealCarbs);

  // PFCスコア（偏差が0なら30点満点）
  const pfcScore = Math.max(0, 30 - deviation * 100);

  // 野菜量ボーナス（献立から推定）
  const vegetableScore = estimateVegetableScore(mainMenu);

  // 加工食品ペナルティ
  const processedPenalty = estimateProcessedFoodPenalty(mainMenu);

  // 最終スコア
  const score = Math.round(pfcScore + vegetableScore - processedPenalty);

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// ヘルパー関数
// ============================================================================

/**
 * 計算に必要な入力データをDBから取得
 */
async function fetchCalculationInput(
  menuGenerationId: string,
): Promise<ScoreCalculationInput | null> {
  const generation = await prisma.menuGeneration.findUnique({
    where: { id: menuGenerationId },
    include: {
      user: {
        include: {
          Ingredient: {
            select: {
              id: true,
              name: true,
              amount: true,
              amountLevel: true,
              expirationDate: true,
            },
          },
        },
      },
    },
  });

  if (!generation) {
    return null;
  }

  return {
    menuGenerationId: generation.id,
    mainMenu: generation.mainMenu,
    alternativeA: generation.alternativeA,
    alternativeB: generation.alternativeB,
    usedIngredients: generation.usedIngredients,
    nutritionInfo: generation.nutritionInfo,
    inventoryIngredients: generation.user.Ingredient,
  };
}

/**
 * usedIngredients JSONをパースして食材名リストを抽出
 */
function parseUsedIngredients(usedIngredients: unknown): string[] {
  if (!usedIngredients) return [];

  try {
    const parsed = usedIngredients as Record<string, unknown>;
    const names: string[] = [];

    // main, altA, altB の構造を想定
    for (const key of ["main", "altA", "altB"]) {
      const items = parsed[key];
      if (Array.isArray(items)) {
        for (const item of items) {
          if (typeof item === "string") {
            names.push(item);
          } else if (item && typeof item === "object") {
            const name = (item as Record<string, unknown>).name;
            if (typeof name === "string") {
              names.push(name);
            }
          }
        }
      }
    }

    return names;
  } catch {
    return [];
  }
}

/**
 * nutritionInfo JSONをパース
 */
function parseNutritionInfo(nutritionInfo: unknown): {
  total: { calories: number; protein: number; fat: number; carbs: number };
} | null {
  try {
    const parsed = nutritionInfo as {
      main?: { total?: { calories?: number; protein?: number; fat?: number; carbs?: number } };
    };

    if (parsed.main?.total) {
      const { calories, protein, fat, carbs } = parsed.main.total;
      return {
        total: {
          calories: calories ?? 0,
          protein: protein ?? 0,
          fat: fat ?? 0,
          carbs: carbs ?? 0,
        },
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 献立データから食材名リストを抽出
 */
function extractIngredientsFromMenu(menuData: unknown): string[] {
  if (!menuData) return [];

  try {
    const menu = menuData as {
      dishes?: Array<{
        ingredients?: Array<{ name?: string }>;
      }>;
    };

    const names: string[] = [];

    if (menu.dishes && Array.isArray(menu.dishes)) {
      for (const dish of menu.dishes) {
        if (dish.ingredients && Array.isArray(dish.ingredients)) {
          for (const ing of dish.ingredients) {
            if (ing.name) {
              names.push(ing.name);
            }
          }
        }
      }
    }

    return names;
  } catch {
    return [];
  }
}

/**
 * 賞味期限が近い食材の消費ボーナスを計算
 */
function calculateExpiringBonus(
  inventoryIngredients: Array<{ name?: string | null; expirationDate?: Date | null }>,
  usedKeys: Set<string>,
): number {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  let bonus = 0;

  for (const ing of inventoryIngredients) {
    if (ing.expirationDate && ing.expirationDate <= threeDaysFromNow) {
      const ingKey = normalizeIngredientKey(ing.name || "");
      if (usedKeys.has(ingKey)) {
        bonus += 0.05; // 期限が近い食材を使うと+5%
      }
    }
  }

  // ボーナス上限は0.3（30%）
  return Math.min(0.3, bonus);
}

/**
 * 野菜量スコアを推定（0 - 40点満点）
 */
function estimateVegetableScore(menuData: unknown): number {
  const vegetableKeywords = [
    "キャベツ",
    "白菜",
    "ほうれん草",
    "トマト",
    "なす",
    "ピーマン",
    "きゅうり",
    "大根",
    "ねぎ",
    "もやし",
    "しめじ",
    "しいたけ",
    "えのき",
    "まいたけ",
    "玉ねぎ",
    "人参",
    "じゃがいも",
    "ブロッコリー",
    "カリフラワー",
    "アスパラガス",
    "オクラ",
    "ゴーヤ",
    "さつまいも",
    "かぼちゃ",
    "とうもろこし",
  ];

  const ingredients = extractIngredientsFromMenu(menuData);

  const vegetableCount = ingredients.filter((name) => {
    const normalized = normalizeIngredientKey(name);
    return vegetableKeywords.some((veg) => normalized.includes(veg));
  }).length;

  // 野菜1品あたり10点、最大40点
  return Math.min(40, vegetableCount * 10);
}

/**
 * 加工食品ペナルティを推定（0 - 20点）
 */
function estimateProcessedFoodPenalty(menuData: unknown): number {
  const processedKeywords = [
    "ウインナー",
    "ソーセージ",
    "ベーコン",
    "ハム",
    "スパム",
    "カレールー",
    "シチュールー",
    "レトルト",
    "インスタント",
    "カップラーメン",
    "冷凍",
    "惣菜",
  ];

  const ingredients = extractIngredientsFromMenu(menuData);

  const processedCount = ingredients.filter((name) => {
    const normalized = normalizeIngredientKey(name);
    return processedKeywords.some((proc) => normalized.includes(proc));
  }).length;

  // 加工食品1品あたり-5点、最大-20点
  return Math.min(20, processedCount * 5);
}

/**
 * 計算されたスコアをDBに保存
 */
async function saveScores(
  menuGenerationId: string,
  scores: MenuScores,
): Promise<void> {
  // Prisma型はマイグレーション後に更新される
  // その間はanyを使用して新しいフィールドにアクセス
  const data = {
    inventoryUsageRate: scores.inventoryUsageRate,
    costEfficiencyScore: scores.costEfficiencyScore,
    healthScore: scores.healthScore,
    totalScore: scores.totalScore,
    scoreVersion: scores.scoreVersion,
    scoredAt: new Date(),
  };

  await (prisma.menuGeneration.update as any)({
    where: { id: menuGenerationId },
    data,
  });
}

// ============================================================================
// エクスポート
// ============================================================================

export {
  calculateInventoryUsageRate,
  calculateCostEfficiencyScore,
  calculateHealthScore,
};
