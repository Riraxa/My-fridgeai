import { addDays } from "date-fns";
import Fuse from "fuse.js";
import type { FoodMaster } from "./types/food";

/**
 * 科学的根拠に基づく食材マスターデータ
 * USDA FoodKeeperおよび国内の一般的な保存目安を統合
 */
import { FOOD_DATABASE } from './food-database';

/**
 * Fuse.js の初期化 - aliases対応と検索精度向上
 */
const fuse = new Fuse(FOOD_DATABASE, {
  keys: [
    { name: "name", weight: 0.7 },  // 主名を重視
    { name: "aliases", weight: 0.3 } // 別名も考慮
  ],
  threshold: 0.4, // 0.4以下を信頼できる一致とする（少し緩和）
  includeScore: true,
  ignoreLocation: true, // 位置を無視して完全一致を重視
  minMatchCharLength: 2, // 最低2文字以上で一致
  shouldSort: true, // スコア順にソート
});

/**
 * 名前から食材情報を曖昧検索する
 */
export function fuzzySearchFood(name: string): FoodMaster | null {
  if (!name) return null;
  const results = fuse.search(name);
  const bestMatch = results[0];
  
  if (bestMatch?.score !== undefined && bestMatch.score < 0.45) {
    return bestMatch.item;
  }
  return null;
}

/**
 * 名前から賞味期限を推定する（メインエンジン）
 */
export function estimateExpirationDate(
  name: string,
  purchasedAt: Date = new Date(),
): Date | null {
  const match = fuzzySearchFood(name);
  if (match) {
    return addDays(purchasedAt, match.days);
  }
  return null;
}

/**
 * 食材の規定の保存期間（日数）を取得する
 */
export function getExpirationDays(name: string): number | null {
  const match = fuzzySearchFood(name);
  return match ? match.days : null;
}
