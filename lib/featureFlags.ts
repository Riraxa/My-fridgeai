/**
 * 機能: 機能フラグ管理
 * 目的: Menu Scoring の段階的リリースを制御
 * 非目的: ABテスト、ユーザー別機能制御
 * セキュリティ: サーバー側でのみ使用、クライアントに露出しない
 */

// 機能フラグ設定
const FEATURE_FLAGS = {
  // Menu Scoring 機能
  MENU_SCORING_ENABLED: process.env.FF_MENU_SCORING === "true" || false,

  // スコア計算の非同期実行
  ASYNC_SCORE_CALCULATION: true, // 常に有効
};

/**
 * 全機能フラグを取得
 */
export function getFeatureFlags() {
  return { ...FEATURE_FLAGS };
}

/**
 * Menu Scoring が有効か
 */
export function isMenuScoringEnabled(): boolean {
  return FEATURE_FLAGS.MENU_SCORING_ENABLED;
}

/**
 * 特定の機能が有効かチェック（booleanフラグのみ）
 */
export function isFeatureEnabled(feature: "MENU_SCORING_ENABLED" | "ASYNC_SCORE_CALCULATION"): boolean {
  return FEATURE_FLAGS[feature] as boolean;
}
