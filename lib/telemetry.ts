// GENERATED_BY_AI: 2026-04-11 antigravity
// lib/telemetry.ts
// クライアントサイドのユーザー行動を /api/telemetry/event へ記録するユーティリティ

/**
 * クライアントサイドのアクションを非同期（fire-and-forget）で記録します。
 * エラーが発生してもアプリの動作に影響しません。
 *
 * @param action  アクション名（例: "view_menu_result", "open_fridge"）最大80文字
 * @param meta    任意の追加情報
 */
export function trackEvent(
  action: string,
  meta?: Record<string, unknown>,
): void {
  // SSR 環境では呼び出しをスキップ
  if (typeof window === "undefined") return;

  void fetch("/api/telemetry/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, meta }),
  }).catch(() => {
    // テレメトリ失敗はサイレントに無視
  });
}

// -------- アプリ内で使用する定義済みアクション --------
export const TelemetryAction = {
  /** 献立生成ページを開いた */
  VIEW_GENERATE_PAGE: "view_generate_page",
  /** 生成された献立の詳細を表示した */
  VIEW_MENU_RESULT: "view_menu_result",
  /** 献立の代替案（A/B）に切り替えた */
  SWITCH_MENU_ALTERNATIVE: "switch_menu_alternative",
  /** お気に入りに追加した */
  ADD_FAVORITE: "add_favorite",
  /** お気に入りから削除した */
  REMOVE_FAVORITE: "remove_favorite",
  /** 冷蔵庫ページを開いた */
  VIEW_FRIDGE: "view_fridge",
  /** 食材を手動で追加した（UI操作） */
  ADD_INGREDIENT_MANUAL: "add_ingredient_manual",
  /** レシートスキャンを開始した */
  START_RECEIPT_SCAN: "start_receipt_scan",
  /** 設定ページを開いた */
  VIEW_SETTINGS: "view_settings",
  /** Proプランアップグレードを試みた */
  UPGRADE_ATTEMPT: "upgrade_attempt",
} as const;

export type TelemetryActionType = (typeof TelemetryAction)[keyof typeof TelemetryAction];
