export type ProFeatures = {
  /** 1日あたりのAI献立生成回数が無制限になる */
  unlimitedAI: boolean;
  /** 消費期限が近い食材を優先的に使用するロジックを有効化 */
  prioritizeExpiry: boolean;
  /** 栄養バランスを考慮した献立提案を有効化 */
  nutritionBalance: boolean;
  /** 不足食材を自動で買い物リスト（DB）に追加する機能 */
  autoShoppingList: boolean;
};

/**
 * ユーザーのProステータスに基づいて、利用可能な機能セットを返します。
 * 将来的にプランが増えた場合もこの関数で吸収します。
 *
 * @param isPro ユーザーがProプランかどうか
 * @returns ProFeatures オブジェクト
 */
export function getProFeatures(isPro: boolean): ProFeatures {
  if (isPro) {
    return {
      unlimitedAI: true,
      prioritizeExpiry: true,
      nutritionBalance: true,
      autoShoppingList: true,
    };
  }

  // Free Plan
  return {
    unlimitedAI: false,
    prioritizeExpiry: false,
    nutritionBalance: false,
    autoShoppingList: false,
  };
}
