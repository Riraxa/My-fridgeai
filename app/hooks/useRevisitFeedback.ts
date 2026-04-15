// GENERATED_BY_AI: 2026-04-05 再訪トリガーフック
"use client";

import { useEffect, useState, useCallback } from "react";

interface PendingMenu {
  menuGenerationId: string;
  dishName: string;
  selectedAt: string;
  daysAgo: number;
}

interface UseRevisitFeedbackReturn {
  pendingMenus: PendingMenu[];
  hasPendingFeedback: boolean;
  isLoading: boolean;
  submitFeedback: (menuGenerationId: string, eventType: "want_again" | "okay" | "never_again") => Promise<void>;
  dismissFeedback: () => void;
}

const STORAGE_KEY = "tasteFeedbackLastCheck";
const DISMISS_UNTIL_KEY = "tasteFeedbackDismissedUntil";

export function useRevisitFeedback(): UseRevisitFeedbackReturn {
  const [pendingMenus, setPendingMenus] = useState<PendingMenu[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 未評価の献立を取得
  useEffect(() => {
    const checkPendingFeedback = async () => {
      // 一時的に非表示にされているか確認
      const dismissedUntil = localStorage.getItem(DISMISS_UNTIL_KEY);
      if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
        return;
      }

      // 最後のチェックから24時間経過しているか確認
      const lastCheck = localStorage.getItem(STORAGE_KEY);
      if (lastCheck) {
        const lastCheckDate = new Date(lastCheck);
        const hoursSinceLastCheck = (Date.now() - lastCheckDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastCheck < 24) {
          return; // 24時間以内にチェック済み
        }
      }

      setIsLoading(true);
      try {
        const response = await fetch("/api/taste/pending-feedback");
        if (!response.ok) {
          // エラー時は無視して終了
          return;
        }

        // HTMLが返ってくる場合があるのでContent-Typeを確認
        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          return;
        }

        const data = await response.json();
        
        // 配列チェック
        const menus = Array.isArray(data.menus) ? data.menus : (data.menus || []);
        
        if (data.hasPendingFeedback && menus.length > 0) {
          setPendingMenus(menus);
        }
        
        // チェック日時を保存
        localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      } catch (error) {
        console.error("[useRevisitFeedback] Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkPendingFeedback();
  }, []);

  // フィードバック送信
  const submitFeedback = useCallback(async (
    menuGenerationId: string,
    eventType: "want_again" | "okay" | "never_again"
  ) => {
    try {
      const menu = pendingMenus.find(m => m.menuGenerationId === menuGenerationId);
      if (!menu) return;

      // 重みは再訪時なので高めに設定
      const weight = eventType === "want_again" ? 2.0 : 
                     eventType === "okay" ? 1.0 : 1.5;

      const response = await fetch("/api/taste/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealPlanResultId: menuGenerationId,
          dishName: menu.dishName,
          eventType,
          weight,
          source: "revisit",
        }),
      });

      if (!response.ok) throw new Error("Failed to submit feedback");

      // 送信済みの献立をリストから削除
      setPendingMenus(prev => prev.filter(m => m.menuGenerationId !== menuGenerationId));
    } catch (error) {
      console.error("[useRevisitFeedback] Submit error:", error);
    }
  }, [pendingMenus]);

  // フィードバックを一時的に非表示
  const dismissFeedback = useCallback(() => {
    // 24時間非表示
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 1);
    localStorage.setItem(DISMISS_UNTIL_KEY, dismissUntil.toISOString());
    setPendingMenus([]);
  }, []);

  return {
    pendingMenus,
    hasPendingFeedback: pendingMenus.length > 0,
    isLoading,
    submitFeedback,
    dismissFeedback,
  };
}
