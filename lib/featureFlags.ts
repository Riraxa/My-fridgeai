/**
 * 機能: 機能フラグ管理
 * 目的: Menu Scoring / Taste Learning の段階的リリースを制御
 * 非目的: ABテスト、ユーザー別機能制御
 * セキュリティ: サーバー側でのみ使用、クライアントに露出しない
 */

import { prisma } from "./prisma";

// 機能フラグ設定
const FEATURE_FLAGS = {
  // Menu Scoring 機能
  MENU_SCORING_ENABLED: process.env.FF_MENU_SCORING === "true" || false,
  
  // Taste Learning 機能（イベント収集）
  TASTE_LEARNING_ENABLED: process.env.FF_TASTE_LEARNING === "true" || false,
  
  // Taste Profile を生成に反映（グローバルON/OFF）
  TASTE_PROFILE_IN_GENERATION: process.env.FF_TASTE_IN_GENERATION === "true" || false,
  
  // 最小イベント数（ユーザーごとに必要なデータ量）
  MIN_TASTE_EVENTS: parseInt(process.env.FF_MIN_TASTE_EVENTS ?? "30"),
  
  // 最小データ日数
  MIN_TASTE_DAYS: parseInt(process.env.FF_MIN_TASTE_DAYS ?? "7"),
  
  // スコア計算の非同期実行
  ASYNC_SCORE_CALCULATION: true, // 常に有効
  
  // TasteEvent 集約
  TASTE_EVENT_AGGREGATION: true, // 常に有効
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
 * Taste Learning が有効か（イベント収集）
 */
export function isTasteLearningEnabled(): boolean {
  return FEATURE_FLAGS.TASTE_LEARNING_ENABLED;
}

/**
 * 特定のユーザーのTaste Profileを生成に反映すべきか
 * グローバルフラグがON かつ ユーザーが十分なデータを持っている場合のみtrue
 */
export async function shouldUseTasteProfileForUser(userId: string): Promise<boolean> {
  // グローバルフラグがOFFなら無条件でfalse
  if (!FEATURE_FLAGS.TASTE_PROFILE_IN_GENERATION || !FEATURE_FLAGS.TASTE_LEARNING_ENABLED) {
    return false;
  }

  try {
    // 1. イベント数チェック
    const eventCount = await (prisma as any).tasteEvent.count({
      where: { userId },
    });

    if (eventCount < FEATURE_FLAGS.MIN_TASTE_EVENTS) {
      return false; // データ不足
    }

    // 2. データの古さチェック（最古イベントがN日以上前か）
    const oldestEvent = await (prisma as any).tasteEvent.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    if (!oldestEvent) return false;

    const daysSince = (Date.now() - oldestEvent.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < FEATURE_FLAGS.MIN_TASTE_DAYS) {
      return false; // データが新しすぎる（十分な期間が経過していない）
    }

    return true; // 十分なデータあり
  } catch (error) {
    console.error("[FeatureFlags] Error checking taste profile:", error);
    return false; // エラー時は安全側に倒す
  }
}

/**
 * @deprecated ユーザー別チェックを使ってください
 */
export function isTasteProfileInGeneration(): boolean {
  return FEATURE_FLAGS.TASTE_PROFILE_IN_GENERATION && FEATURE_FLAGS.TASTE_LEARNING_ENABLED;
}

/**
 * 特定の機能が有効かチェック（booleanフラグのみ）
 */
export function isFeatureEnabled(feature: "MENU_SCORING_ENABLED" | "TASTE_LEARNING_ENABLED" | "TASTE_PROFILE_IN_GENERATION" | "ASYNC_SCORE_CALCULATION" | "TASTE_EVENT_AGGREGATION"): boolean {
  return FEATURE_FLAGS[feature] as boolean;
}
