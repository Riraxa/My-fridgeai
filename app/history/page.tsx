//app/history/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, RotateCcw, Utensils } from "lucide-react";
import { motion } from "framer-motion";

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.history) {
        setHistory(data.history);
      }
    } catch (e) {
      console.error("Fetch history failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleCancel = async (historyId: string) => {
    if (!confirm("この料理記録を取り消して在庫を戻しますか？")) return;

    setProcessing(historyId);

    try {
      const res = await fetch("/api/menu/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookingHistoryId: historyId }),
      });
      if (res.ok) {
        // 即座にUIを更新
        setHistory((prev) =>
          prev.map((h) =>
            h.id === historyId ? { ...h, status: "cancelled" } : h,
          ),
        );
        alert("取り消しました");
        // バックグラウンドで最新データを取得
        fetchHistory();
      } else {
        const data = await res.json();
        alert(data.error || "取り消しに失敗しました");
      }
    } catch (_e) {
      alert("通信エラーが発生しました");
    } finally {
      setProcessing(null);
    }
  };

  const handleUncancel = async (historyId: string) => {
    if (!confirm("取り消しを元に戻しますか？")) return;

    setProcessing(historyId);

    try {
      const res = await fetch("/api/menu/uncancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookingHistoryId: historyId }),
      });
      if (res.ok) {
        // 即座にUIを更新
        setHistory((prev) =>
          prev.map((h) =>
            h.id === historyId ? { ...h, status: "completed" } : h,
          ),
        );
        alert("元に戻しました");
        // バックグラウンドで最新データを取得
        fetchHistory();
      } else {
        const data = await res.json();
        alert(data.error || "元に戻すことに失敗しました");
      }
    } catch (_e) {
      alert("通信エラーが発生しました");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="container mx-auto min-h-screen pb-32 bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--surface-border)] backdrop-blur-lg bg-[var(--background)]/70 px-4 py-4">
        <button
          onClick={() => router.back()}
          className="p-1 rounded-full transition"
          style={{
            background: "var(--surface-bg)",
            border: "1px solid var(--surface-border)",
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1
          className="text-lg font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          料理の履歴
        </h1>
        <div className="w-8" /> {/* Spacer */}
      </header>

      <main className="p-4 space-y-4">
        {loading ? (
          <div
            className="text-center py-20"
            style={{ color: "var(--color-text-secondary)" }}
          >
            読み込み中...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-20">
            <Utensils
              size={48}
              className="mx-auto mb-4"
              style={{ color: "var(--color-text-muted)" }}
            />
            <p
              className="font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              まだ料理の記録がありません。
            </p>
            <button
              onClick={() => router.push("/menu/generate")}
              className="mt-4 font-medium transition"
              style={{ color: "var(--accent)" }}
            >
              さっそく献立を作る →
            </button>
          </div>
        ) : (
          history.map((h) => {
            const canCancel =
              new Date() < new Date(h.cancellableUntil) &&
              h.status !== "cancelled";
            const isCancelled = h.status === "cancelled";
            const dishes = h.cookedDishes || [];

            return (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`card p - 4 border border - [var(--surface - border)] ${isCancelled ? "opacity-60" : ""} `}
                style={{ background: isCancelled ? "var(--surface-bg)" : "" }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div
                    className="text-xs font-medium"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {new Date(h.cookedAt).toLocaleString("ja-JP", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {isCancelled && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-medium"
                      style={{
                        background: "var(--surface-bg)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      取り消し済み
                    </span>
                  )}
                </div>

                <div
                  className="font-bold text-base mb-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {h.menuGeneration?.mainMenu?.title || "献立"}
                </div>

                <div className="space-y-1 mb-4">
                  {dishes.map((d: any, idx: number) => (
                    <div
                      key={idx}
                      className="text-sm flex items-center gap-2"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "var(--accent)" }}
                      />
                      {d}
                    </div>
                  ))}
                </div>

                {canCancel && (
                  <button
                    onClick={() => handleCancel(h.id)}
                    disabled={processing === h.id}
                    className="flex items-center gap-1.5 text-xs font-medium transition"
                    style={{
                      color: processing === h.id ? "#9ca3af" : "#dc2626",
                      cursor: processing === h.id ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (processing !== h.id) {
                        e.currentTarget.style.color = "#b91c1c";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (processing !== h.id) {
                        e.currentTarget.style.color = "#dc2626";
                      }
                    }}
                  >
                    <RotateCcw
                      size={14}
                      className={processing === h.id ? "animate-spin" : ""}
                    />
                    <span>
                      {processing === h.id ? "処理中..." : "取り消す"}
                    </span>
                  </button>
                )}
                {isCancelled && (
                  <button
                    onClick={() => handleUncancel(h.id)}
                    disabled={processing === h.id}
                    className="flex items-center gap-1.5 text-xs font-medium transition"
                    style={{
                      color: processing === h.id ? "#9ca3af" : "#059669",
                      cursor: processing === h.id ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (processing !== h.id) {
                        e.currentTarget.style.color = "#047857";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (processing !== h.id) {
                        e.currentTarget.style.color = "#059669";
                      }
                    }}
                  >
                    <RotateCcw
                      size={14}
                      className={processing === h.id ? "animate-spin" : ""}
                    />
                    <span>
                      {processing === h.id ? "処理中..." : "取り消しを元に戻す"}
                    </span>
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </main>
    </div>
  );
}
