/**
 * 機能: UserTasteProfile ビルドロジック
 * 目的: TasteEventを集約し、ユーザーの好みプロファイルを構築
 * 非目的: 機械学習モデル、リアルタイム推論
 * 変更方針: 破壊的変更禁止 / 段階的更新
 * セキュリティ: ユーザー分離 / PII最小化
 *
 * アルゴリズム:
 * 1. 過去90日のTasteEventを取得
 * 2. 食材/調理法ごとにスコア集計
 * 3. 上位Nを好みリスト、下位Nを嫌いリストとして抽出
 * 4. UserTasteProfileを更新
 */

import { prisma } from "@/lib/prisma";
import { normalizeIngredientKey } from "@/lib/taste/normalizeIngredientKey";

// ============================================================================
// 型定義
// ============================================================================

export interface TasteProfileData {
  favoriteIngredients: string[];
  dislikedIngredients: string[];
  favoriteCookingStyles: string[];
  dislikedCookingStyles: string[];
  favoriteProcessedProducts: string[];
}

export interface BuildProfileOptions {
  daysBack?: number;      // 集計対象日数（デフォルト90日）
  topN?: number;          // 好みリストの上位N（デフォルト20）
  bottomN?: number;       // 嫌いリストの下位N（デフォルト10）
  minWeightThreshold?: number; // 最小weight閾値（デフォルト0.5）
}

interface AggregatedScore {
  key: string;
  score: number;
  eventCount: number;
  lastEventAt: Date;
}

// ============================================================================
// メイン関数
// ============================================================================

/**
 * ユーザーのTasteProfileを構築/更新する
 *
 * @param userId - 対象ユーザーID
 * @param options - ビルドオプション
 * @returns 構築されたプロファイルデータ
 */
export async function buildTasteProfile(
  userId: string,
  options: BuildProfileOptions = {}
): Promise<TasteProfileData> {
  const {
    daysBack = 90,
    topN = 20,
    bottomN = 10,
    minWeightThreshold = 0.5,
  } = options;

  // 1. 対象期間のイベントを取得
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const events = await prisma.tasteEvent.findMany({
    where: {
      userId,
      createdAt: {
        gte: since,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // 2. 食材スコアを集計
  const ingredientScores = aggregateIngredientScores(events, minWeightThreshold);

  // 3. 調理法を推定（料理名・献立タイトルから）
  const cookingStyleScores = await estimateCookingStyles(userId, since);

  // 4. 加工食品スコアを集計
  const processedProductScores = await aggregateProcessedProductScores(
    userId,
    since,
    minWeightThreshold
  );

  // 5. ランキング抽出
  const sortedIngredients = Object.values(ingredientScores).sort(
    (a, b) => b.score - a.score
  );

  const favoriteIngredients = sortedIngredients
    .slice(0, topN)
    .filter((item) => item.score > 0)
    .map((item) => item.key);

  const dislikedIngredients = sortedIngredients
    .slice(-bottomN)
    .filter((item) => item.score < 0)
    .map((item) => item.key);

  const sortedStyles = Object.values(cookingStyleScores).sort(
    (a, b) => b.score - a.score
  );

  const favoriteCookingStyles = sortedStyles
    .slice(0, Math.min(5, topN))
    .filter((item) => item.score > 0)
    .map((item) => item.key);

  const dislikedCookingStyles = sortedStyles
    .slice(-Math.min(3, bottomN))
    .filter((item) => item.score < 0)
    .map((item) => item.key);

  const sortedProcessed = Object.values(processedProductScores).sort(
    (a, b) => b.score - a.score
  );

  const favoriteProcessedProducts = sortedProcessed
    .slice(0, Math.min(10, topN))
    .filter((item) => item.score > 0)
    .map((item) => item.key);

  return {
    favoriteIngredients,
    dislikedIngredients,
    favoriteCookingStyles,
    dislikedCookingStyles,
    favoriteProcessedProducts,
  };
}

/**
 * UserTasteProfileをDBに保存/更新する
 *
 * @param userId - 対象ユーザーID
 * @param profileData - 保存するプロファイルデータ
 * @param householdId - 世帯ID（オプション）
 */
export async function saveTasteProfile(
  userId: string,
  profileData: TasteProfileData,
  householdId?: string | null
): Promise<void> {
  const existing = await prisma.userTasteProfile.findUnique({
    where: { userId },
  });

  if (existing) {
    await prisma.userTasteProfile.update({
      where: { userId },
      data: {
        householdId,
        favoriteIngredients: profileData.favoriteIngredients,
        dislikedIngredients: profileData.dislikedIngredients,
        favoriteCookingStyles: profileData.favoriteCookingStyles,
        dislikedCookingStyles: profileData.dislikedCookingStyles,
        favoriteProcessedProducts: profileData.favoriteProcessedProducts,
        version: { increment: 1 },
      },
    });
  } else {
    await prisma.userTasteProfile.create({
      data: {
        userId,
        householdId,
        favoriteIngredients: profileData.favoriteIngredients,
        dislikedIngredients: profileData.dislikedIngredients,
        favoriteCookingStyles: profileData.favoriteCookingStyles,
        dislikedCookingStyles: profileData.dislikedCookingStyles,
        favoriteProcessedProducts: profileData.favoriteProcessedProducts,
      },
    });
  }
}

/**
 * プロファイルを構築して即座に保存する（バッチ処理用）
 *
 * @param userId - 対象ユーザーID
 * @param options - ビルドオプション
 */
export async function buildAndSaveTasteProfile(
  userId: string,
  options?: BuildProfileOptions
): Promise<TasteProfileData> {
  // householdId取得（Userモデルに存在する場合）
  const user = await (prisma.user.findUnique as any)({
    where: { id: userId },
    select: { id: true },
  });

  const profile = await buildTasteProfile(userId, options);
  await saveTasteProfile(userId, profile, null); // householdId未対応
  return profile;
}

// ============================================================================
// 集計ヘルパー関数
// ============================================================================

/**
 * TasteEventから食材スコアを集計
 */
function aggregateIngredientScores(
  events: Array<{
    ingredientKey: string;
    eventType: string;
    weight: number;
    createdAt: Date;
  }>,
  minThreshold: number
): Record<string, AggregatedScore> {
  const scores: Record<string, AggregatedScore> = {};

  // イベントタイプごとの係数
  const weights: Record<string, number> = {
    used: 1.0,
    liked: 2.0,
    repeated: 3.0,
    skipped: -1.0,
    disliked: -2.0,
    removed: -3.0,
  };

  for (const event of events) {
    // 最小閾値チェック
    if (event.weight < minThreshold) continue;

    const key = normalizeIngredientKey(event.ingredientKey);
    const typeWeight = weights[event.eventType] ?? 0;

    if (!scores[key]) {
      scores[key] = {
        key,
        score: 0,
        eventCount: 0,
        lastEventAt: event.createdAt,
      };
    }

    // スコア加算（weight * イベントタイプ係数）
    scores[key].score += event.weight * typeWeight;
    scores[key].eventCount += 1;

    // 最新イベント日時を記録
    if (event.createdAt > scores[key].lastEventAt) {
      scores[key].lastEventAt = event.createdAt;
    }
  }

  return scores;
}

/**
 * 調理法を推定してスコア集計
 * （料理名、献立タイトルからキーワード抽出）
 */
async function estimateCookingStyles(
  userId: string,
  since: Date
): Promise<Record<string, AggregatedScore>> {
  // 調理法キーワード定義
  const cookingStyleKeywords: Record<string, string[]> = {
    "炒め物": ["炒め", "炒め物", "ステーキ", "ソテー"],
    "煮物": ["煮", "煮物", "シチュー", "カレー", "煮込み"],
    "蒸し物": ["蒸し", "蒸し物", "チンジャオロース"],
    "揚げ物": ["揚げ", "フライ", "天ぷら", "唐揚げ", "カツ"],
    "焼き物": ["焼き", "グリル", "焼肉", "ロースト"],
    "和食": ["和食", "日本", "和風", "出汁"],
    "洋食": ["洋食", "西洋", "洋風", "イタリアン", "フレンチ"],
    "中華": ["中華", "中国", "中華風", "炒飯"],
    "韓国料理": ["韓国", "韓国風", "キムチ", "チゲ"],
    "エスニック": ["エスニック", "タイ", "ベトナム", "インド", "カレー"],
    "丼物": ["丼", "どんぶり", "丼物", "ライスボウル"],
    "麺類": ["麺", "パスタ", "うどん", "そば", "ラーメン"],
    "汁物": ["汁", "スープ", "味噌汁", "シチュー"],
  };

  // MenuGenerationからユーザーの献立履歴を取得
  const generations = await prisma.menuGeneration.findMany({
    where: {
      userId,
      generatedAt: {
        gte: since,
      },
      selectedMenu: {
        not: null,
      },
    },
    select: {
      selectedMenu: true,
      mainMenu: true,
    },
    take: 100,
  });

  const scores: Record<string, AggregatedScore> = {};

  // 選択された献立から調理法を推定
  for (const gen of generations) {
    const menuData = gen.mainMenu as {
      title?: string;
      dishes?: Array<{ name?: string; type?: string }>;
    } | null;

    if (!menuData) continue;

    const text = `${menuData.title ?? ""} ${
      menuData.dishes?.map((d) => d.name).join(" ") ?? ""
    }`;

    for (const [style, keywords] of Object.entries(cookingStyleKeywords)) {
      const matched = keywords.some((kw) => text.includes(kw));
      if (matched) {
        if (!scores[style]) {
          scores[style] = {
            key: style,
            score: 0,
            eventCount: 0,
            lastEventAt: new Date(),
          };
        }
        scores[style].score += 1; // 選択された = +1ポイント
        scores[style].eventCount += 1;
      }
    }
  }

  return scores;
}

/**
 * 加工食品の好みスコアを集計
 */
async function aggregateProcessedProductScores(
  userId: string,
  since: Date,
  minThreshold: number
): Promise<Record<string, AggregatedScore>> {
  // 加工食品キーワード
  const processedKeywords = [
    "ウインナー",
    "ソーセージ",
    "ベーコン",
    "ハム",
    "スパム",
    "カレールー",
    "シチュールー",
    "レトルト",
    "冷凍食品",
    "惣菜",
    "缶詰",
  ];

  // TasteEventから加工食品関連イベントを取得
  const events = await prisma.tasteEvent.findMany({
    where: {
      userId,
      createdAt: {
        gte: since,
      },
      OR: processedKeywords.map((kw) => ({
        ingredientKey: {
          contains: kw,
        },
      })),
    },
  });

  const scores: Record<string, AggregatedScore> = {};

  const weights: Record<string, number> = {
    used: 1.0,
    liked: 2.0,
    skipped: -0.5,
    disliked: -1.0,
  };

  for (const event of events) {
    if (event.weight < minThreshold) continue;

    // どの加工食品キーワードにマッチしたか
    const matchedKeyword = processedKeywords.find((kw) =>
      event.ingredientKey.includes(kw)
    );

    if (!matchedKeyword) continue;

    const typeWeight = weights[event.eventType] ?? 0;

    if (!scores[matchedKeyword]) {
      scores[matchedKeyword] = {
        key: matchedKeyword,
        score: 0,
        eventCount: 0,
        lastEventAt: event.createdAt,
      };
    }

    scores[matchedKeyword].score += event.weight * typeWeight;
    scores[matchedKeyword].eventCount += 1;
  }

  return scores;
}

// ============================================================================
// エクスポート
// ============================================================================

export {
  aggregateIngredientScores,
  estimateCookingStyles,
  aggregateProcessedProductScores,
};
