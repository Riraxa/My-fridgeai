/**
 * 機能: UserTasteProfile ビルドロジック
 * 目的: TasteEventを集約し、ユーザーの好みプロファイルを構築
 */

import { prisma } from "@/lib/prisma";
import { normalizeIngredientKey } from "@/lib/taste/normalizeIngredientKey";

// ============================================================================
// 型定義（スキーマ列名に合わせて整合）
// ============================================================================

export interface TasteProfileData {
  favoriteIngredients: string[];
  dislikedIngredients: string[];
  favoriteDishes:      string[];
  dislikedDishes:      string[];
  favoriteMethods:     string[];
  dislikedMethods:     string[];
}

export interface BuildProfileOptions {
  daysBack?: number;
  topN?: number;
  bottomN?: number;
  minWeightThreshold?: number;
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

  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const events = await prisma.tasteEvent.findMany({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });

  const ingredientScores = aggregateIngredientScores(events, minWeightThreshold);
  const cookingMethodScores = await estimateCookingStyles(userId, since);
  const dishScores = await aggregateDishScores(userId, since);

  const sortedIngredients = Object.values(ingredientScores).sort((a, b) => b.score - a.score);
  const sortedMethods = Object.values(cookingMethodScores).sort((a, b) => b.score - a.score);
  const sortedDishes = Object.values(dishScores).sort((a, b) => b.score - a.score);

  return {
    favoriteIngredients: sortedIngredients.slice(0, topN).filter(i => i.score > 0).map(i => i.key),
    dislikedIngredients: sortedIngredients.slice(-bottomN).filter(i => i.score < 0).map(i => i.key),
    favoriteDishes:      sortedDishes.slice(0, Math.min(10, topN)).filter(i => i.score > 0).map(i => i.key),
    dislikedDishes:      sortedDishes.slice(-Math.min(5, bottomN)).filter(i => i.score < 0).map(i => i.key),
    favoriteMethods:     sortedMethods.slice(0, Math.min(5, topN)).filter(i => i.score > 0).map(i => i.key),
    dislikedMethods:     sortedMethods.slice(-Math.min(3, bottomN)).filter(i => i.score < 0).map(i => i.key),
  };
}

export async function saveTasteProfile(
  userId: string,
  profileData: TasteProfileData,
  householdId?: string | null
): Promise<void> {
  const existing = await prisma.userTasteProfile.findUnique({ where: { userId } });

  if (existing) {
    await prisma.userTasteProfile.update({
      where: { userId },
      data: {
        householdId,
        favoriteIngredients: profileData.favoriteIngredients,
        dislikedIngredients: profileData.dislikedIngredients,
        favoriteDishes:      profileData.favoriteDishes,
        dislikedDishes:      profileData.dislikedDishes,
        favoriteMethods:     profileData.favoriteMethods,
        dislikedMethods:     profileData.dislikedMethods,
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
        favoriteDishes:      profileData.favoriteDishes,
        dislikedDishes:      profileData.dislikedDishes,
        favoriteMethods:     profileData.favoriteMethods,
        dislikedMethods:     profileData.dislikedMethods,
      },
    });
  }
}

export async function buildAndSaveTasteProfile(
  userId: string,
  options?: BuildProfileOptions
): Promise<TasteProfileData> {
  const profile = await buildTasteProfile(userId, options);
  await saveTasteProfile(userId, profile, null);
  return profile;
}

// ============================================================================
// 集計ヘルパー
// ============================================================================

function aggregateIngredientScores(
  events: Array<{
    ingredientKey: string | null;
    eventType: string;
    weight: number;
    createdAt: Date;
  }>,
  minThreshold: number
): Record<string, AggregatedScore> {
  const scores: Record<string, AggregatedScore> = {};
  const weights: Record<string, number> = {
    used: 1.0, liked: 2.0, repeated: 3.0,
    skipped: -1.0, disliked: -2.0, removed: -3.0,
  };

  for (const event of events) {
    if (event.weight < minThreshold || !event.ingredientKey) continue;
    const key = normalizeIngredientKey(event.ingredientKey);
    const typeWeight = weights[event.eventType] ?? 0;

    if (!scores[key]) {
      scores[key] = { key, score: 0, eventCount: 0, lastEventAt: event.createdAt };
    }
    scores[key].score += event.weight * typeWeight;
    scores[key].eventCount += 1;
    if (event.createdAt > scores[key].lastEventAt) {
      scores[key].lastEventAt = event.createdAt;
    }
  }
  return scores;
}

async function estimateCookingStyles(
  userId: string,
  since: Date
): Promise<Record<string, AggregatedScore>> {
  const cookingStyleKeywords: Record<string, string[]> = {
    "炒め物": ["炒め", "炒め物", "ステーキ", "ソテー"],
    "煮物":   ["煮", "煮物", "シチュー", "カレー", "煮込み"],
    "蒸し物": ["蒸し", "蒸し物"],
    "揚げ物": ["揚げ", "フライ", "天ぷら", "唐揚げ", "カツ"],
    "焼き物": ["焼き", "グリル", "焼肉", "ロースト"],
    "和食":   ["和食", "和風", "出汁"],
    "洋食":   ["洋食", "洋風", "イタリアン", "フレンチ"],
    "中華":   ["中華", "中華風", "炒飯"],
    "韓国料理": ["韓国", "キムチ", "チゲ"],
    "丼物":   ["丼", "どんぶり"],
    "麺類":   ["麺", "パスタ", "うどん", "そば", "ラーメン"],
    "汁物":   ["汁", "スープ", "味噌汁"],
  };

  const generations = await prisma.menuGeneration.findMany({
    where: { userId, generatedAt: { gte: since }, selectedMenu: { not: null } },
    select: { selectedMenu: true, mainMenu: true },
    take: 100,
  });

  const scores: Record<string, AggregatedScore> = {};

  for (const gen of generations) {
    const menuData = gen.mainMenu as { title?: string; dishes?: Array<{ name?: string }> } | null;
    if (!menuData) continue;

    const text = `${menuData.title ?? ""} ${menuData.dishes?.map(d => d.name).join(" ") ?? ""}`;

    for (const [style, keywords] of Object.entries(cookingStyleKeywords)) {
      if (keywords.some(kw => text.includes(kw))) {
        if (!scores[style]) {
          scores[style] = { key: style, score: 0, eventCount: 0, lastEventAt: new Date() };
        }
        scores[style].score += 1;
        scores[style].eventCount += 1;
      }
    }
  }
  return scores;
}

async function aggregateDishScores(
  userId: string,
  since: Date
): Promise<Record<string, AggregatedScore>> {
  const events = await prisma.tasteEvent.findMany({
    where: { userId, createdAt: { gte: since }, dishName: { not: null } },
  });

  const scores: Record<string, AggregatedScore> = {};
  const weights: Record<string, number> = {
    want_again: 2.0, okay: 0.5, never_again: -2.0,
    liked: 2.0, disliked: -2.0,
  };

  for (const event of events) {
    if (!event.dishName) continue;
    const key = event.dishName;
    const typeWeight = weights[event.eventType] ?? 0;

    if (!scores[key]) {
      scores[key] = { key, score: 0, eventCount: 0, lastEventAt: event.createdAt };
    }
    scores[key].score += event.weight * typeWeight;
    scores[key].eventCount += 1;
  }
  return scores;
}

// ============================================================================
// エクスポート
// ============================================================================

export { aggregateIngredientScores, estimateCookingStyles };
