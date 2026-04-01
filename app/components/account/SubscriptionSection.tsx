"use client";

import { useState } from "react";
import type { Session } from "next-auth";
import { Button } from "@/app/components/ui/button";
import ProModal from "@/app/components/ProModal";
import { useNativeConfirm } from "@/app/hooks/useOSDetection";

interface SubscriptionSectionProps {
  displaySession: Session;
  isSyncing: boolean;
}

export default function SubscriptionSection({ displaySession, isSyncing }: SubscriptionSectionProps) {
  const [showProModal, setShowProModal] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const { confirm: nativeConfirm } = useNativeConfirm();

  const isPro = (displaySession.user as any)?.plan === "PRO";
  const user = displaySession.user as any;

  const handleCancelSubscription = async () => {
    const message = `本当に解約しますか？

【ご確認事項】
・解約後も現在の請求期間が終了するまでは Pro 機能をご利用いただけます。
・請求期間終了後、自動更新は行われません。
・返金は行われませんのでご了承ください。`;

    const confirmed = nativeConfirm(message, "解約の確認");
    if (!confirmed) return;

    setIsPortalLoading(true);
    try {
      const res = await fetch("/api/billing-portal", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Portalの起動に失敗しました");
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert(`エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsPortalLoading(false);
    }
  };

  return (
    <section>
      {isPro ? (
        <div className="space-y-4">
          <div className="card border-2 border-orange-400/30 bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-900/20 dark:to-amber-900/20">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-lg" style={{ color: "var(--accent)" }}>
                Pro サポーター 🌟
              </div>
              <div className="flex items-center gap-2">
                {isSyncing && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    同期中
                  </div>
                )}
                {user?.cancelAtPeriodEnd ? (
                  <span className="text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                    解約予約中
                  </span>
                ) : (
                  <span
                    className="text-xs px-3 py-1.5 rounded-full font-semibold"
                    style={{
                      background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                      color: "var(--accent)",
                      border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                    }}
                  >
                    有効
                  </span>
                )}
              </div>
            </div>
            <p className="text-base leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {user?.cancelAtPeriodEnd
                ? "Proプランは解約済みです。"
                : "ご支援ありがとうございます！あなたのサポートが開発の力になります。"}
            </p>
            {user?.cancelAtPeriodEnd && user.stripeCurrentPeriodEnd && (
              <p className="text-sm font-medium mt-2" style={{ color: "var(--accent)" }}>
                機能は {new Date(user.stripeCurrentPeriodEnd).toLocaleDateString()} までご利用いただけます。
              </p>
            )}
          </div>

          <div className="card">
            <h3 className="font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
              サブスクリプション管理
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
              お支払い方法の変更や、
              {user?.cancelAtPeriodEnd ? "解約のキャンセル" : "プランの解約"} などの手続きを行えます。
            </p>
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleCancelSubscription}
                disabled={isPortalLoading}
                className="w-full sm:w-auto transition-all hover:scale-[1.02]"
                style={{
                  background: "transparent",
                  border: "1px solid var(--surface-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {isPortalLoading
                  ? "読み込み中..."
                  : user?.cancelAtPeriodEnd
                  ? "解約をキャンセルする"
                  : "Proプランを解約する"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 border-2 border-orange-400 relative overflow-hidden rounded-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1" style={{ color: "var(--accent)" }}>
                Proプランで応援する
              </h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✨ 1日の献立生成数が3回にUP</li>
                <li>📅 1週間分の献立を一括作成</li>
                <li>🍽️ 最大8人前まで生成可能</li>
                <li>💰 1食あたりの予算を指定可能</li>
                <li>🥕 期限切れ食材を優先消費</li>
              </ul>
            </div>
            <Button
              onClick={() => setShowProModal(true)}
              className="font-bold shadow-md whitespace-nowrap"
              style={{ background: "var(--accent)", color: "#fff", border: "none" }}
            >
              Proで応援する
            </Button>
          </div>
        </div>
      )}

      <ProModal open={showProModal} onClose={() => setShowProModal(false)} />
    </section>
  );
}
