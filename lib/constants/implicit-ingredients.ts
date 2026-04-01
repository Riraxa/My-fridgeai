// GENERATED_BY_AI: 2026-03-18 antigravity
// lib/constants/implicit-ingredients.ts
//
// 暗黙食材（Implicit Ingredients）
// ユーザーが登録していなくても「常に使用可能」とみなす食材。
// Strict モードでも在庫チェック対象外として扱う。

/**
 * デフォルトの暗黙食材リスト
 * ※ 卵は含めない（設計書に基づく）
 */
export const DEFAULT_IMPLICIT_INGREDIENTS: readonly string[] = [
  "水",
  "塩",
  "砂糖",
  "醤油",
  "味噌",
  "油",
  "米",
  "小麦粉",
] as const;

/**
 * 暗黙食材の拡張マッピング
 * AI が別表記で生成した場合にもマッチできるよう、同義語を定義する。
 */
export const IMPLICIT_INGREDIENT_ALIASES: Record<string, readonly string[]> = {
  "水": ["水", "お水"],
  "塩": ["塩", "食塩", "しお"],
  "砂糖": ["砂糖", "上白糖", "グラニュー糖"],
  "醤油": ["醤油", "しょうゆ", "しょう油", "薄口醤油", "濃口醤油"],
  "味噌": ["味噌", "みそ", "白味噌", "赤味噌", "合わせ味噌"],
  "油": ["油", "サラダ油", "植物油", "ごま油", "オリーブオイル", "オリーブ油"],
  "米": ["米", "お米", "ご飯", "白米"],
  "小麦粉": ["小麦粉", "薄力粉", "強力粉", "中力粉"],
} as const;

/**
 * AI プロンプトに追加する基本調味料リスト
 * 既存プロンプトとの後方互換性を維持しつつ、Strict モード用に明示的な一覧を提供する。
 * 注意: 既存プロンプトでは こしょう・みりん・酒 も基本調味料として許可されていた。
 * Strict モードではそれらも暗黙食材扱いとする（ユーザビリティ考慮）。
 */
export const IMPLICIT_INGREDIENTS_FOR_PROMPT: readonly string[] = [
  ...DEFAULT_IMPLICIT_INGREDIENTS,
  "こしょう",
  "みりん",
  "酒",
  "料理酒",
] as const;

/**
 * 指定された食材名が暗黙食材かどうかを判定する
 * @param name - 食材名
 * @param customIngredients - ユーザー設定のカスタム暗黙食材（オプション）
 */
export function isImplicitIngredient(name: string, customIngredients?: string[]): boolean {
  const normalized = name.toLowerCase().trim();

  // 1. デフォルトの暗黙食材をチェック
  for (const aliases of Object.values(IMPLICIT_INGREDIENT_ALIASES)) {
    for (const alias of aliases) {
      if (alias.toLowerCase() === normalized) {
        return true;
      }
    }
  }

  // 2. 追加で許可されている基本調味料もチェック
  const extras = ["こしょう", "コショウ", "胡椒", "みりん", "酒", "料理酒"];
  if (extras.some((e) => e.toLowerCase() === normalized)) {
    return true;
  }

  // 3. カスタム暗黙食材をチェック
  if (customIngredients && customIngredients.length > 0) {
    return customIngredients.some((ing) => ing.toLowerCase().trim() === normalized);
  }

  return false;
}
