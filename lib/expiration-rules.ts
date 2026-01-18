import { addDays } from "date-fns";

/**
 * Common expiration rules for Japanese ingredients (in days)
 * Based on typical refrigerator storage life.
 */
const EXPIRATION_RULES: Record<string, number> = {
  // Dairy & Eggs
  牛乳: 7,
  卵: 14,
  チーズ: 14,
  ヨーグルト: 10,

  // Meats
  鶏肉: 2,
  豚肉: 3,
  牛肉: 3,
  挽肉: 1,
  ハム: 5,
  ベーコン: 7,
  ソーセージ: 7,

  // Fish
  鮭: 2,
  切り身: 2,
  刺身: 1,

  // Vegetables
  キャベツ: 14,
  玉ねぎ: 30, // Assuming cool storage
  人参: 21,
  じゃがいも: 30, // Assuming cool storage
  レタス: 5,
  トマト: 5,
  きゅうり: 4,
  ほうれん草: 3,
  小松菜: 3,
  大根: 10,
  白菜: 10,
  ネギ: 7,
  長ネギ: 7,
  ブロッコリー: 5,
  ピーマン: 7,
  なす: 4,
  もやし: 2,
  きのこ: 4,

  // Condiments (Opened estimation)
  醤油: 90,
  みりん: 90,
  酒: 90,
  マヨネーズ: 30,
  ケチャップ: 30,
  ポン酢: 60,
  ドレッシング: 30,

  // Others
  豆腐: 3,
  納豆: 7,
  パン: 3,
};

/**
 * Estimate expiration date based on ingredient name.
 * Returns undefined if no rule matches.
 */
export function estimateExpirationDate(
  name: string,
  purchasedAt: Date = new Date(),
): Date | null {
  // Normalize name (simple normalization)
  const normalizedName = name.trim();

  // Try exact match
  if (EXPIRATION_RULES[normalizedName]) {
    return addDays(purchasedAt, EXPIRATION_RULES[normalizedName]);
  }

  // Try partial match (e.g. "豚肉小間切れ" -> "豚肉")
  // Sort keys by length (descending) to match longest specific rule first
  const sortedKeys = Object.keys(EXPIRATION_RULES).sort(
    (a, b) => b.length - a.length,
  );

  for (const key of sortedKeys) {
    if (normalizedName.includes(key)) {
      return addDays(purchasedAt, EXPIRATION_RULES[key]);
    }
  }

  return null;
}

/**
 * Get default days for an ingredient if known
 */
export function getExpirationDays(name: string): number | null {
  const normalizedName = name.trim();
  if (EXPIRATION_RULES[normalizedName]) {
    return EXPIRATION_RULES[normalizedName];
  }

  const sortedKeys = Object.keys(EXPIRATION_RULES).sort(
    (a, b) => b.length - a.length,
  );
  for (const key of sortedKeys) {
    if (normalizedName.includes(key)) {
      return EXPIRATION_RULES[key];
    }
  }

  return null;
}
