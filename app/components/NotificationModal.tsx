//app/components/NotificationModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { X, Bell, Calendar, AlertCircle, Trash2, ChefHat } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { springTransition } from "./motion";
import { useRouter } from "next/navigation";

interface Alert {
  id: string;
  alertType: string;
  lastAlertedAt: string;
  ingredient?: {
    name: string;
    expirationDate: string;
  };
}

export default function NotificationModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setAlerts(data.alerts || []);
        }
      } catch (e) {
        console.error("Failed to fetch notifications", e);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  const handleDelete = async (alertId: string) => {
    setDeletingIds((prev) => new Set(prev).add(alertId));
    try {
      const res = await fetch(`/api/notifications?id=${alertId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
      }
    } catch (e) {
      console.error("Failed to delete notification", e);
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const handleGenerateMenu = () => {
    onClose();
    router.push("/menu/generate");
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-sm modal-card shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={springTransition}
      >
        <div
          className="p-6 flex justify-between items-center"
          style={{ borderBottom: "1px solid var(--surface-border)" }}
        >
          <div className="flex items-center gap-2">
            <Bell size={20} style={{ color: "var(--accent)" }} />
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              通知一覧
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition"
            style={{
              background: "var(--surface-bg)",
              border: "1px solid var(--surface-border)",
            }}
          >
            <X size={20} style={{ color: "var(--color-text-secondary)" }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div
                className="w-8 h-8 rounded-full animate-spin"
                style={{
                  border: "4px solid var(--surface-border)",
                  borderTop: "4px solid var(--accent)",
                }}
              />
              <p
                className="text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                読み込み中...
              </p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: "var(--surface-bg)" }}
              >
                <Bell size={32} style={{ color: "var(--color-text-muted)" }} />
              </div>
              <p
                className="font-medium"
                style={{ color: "var(--color-text-primary)" }}
              >
                通知はありません
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                賞味期限が近づくとお知らせします
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <motion.div
                key={alert.id}
                className="relative"
                initial={{ x: 0 }}
                animate={{
                  x: swipingId === alert.id ? -100 : 0,
                  opacity: deletingIds.has(alert.id) ? 0 : 1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {/* 削除ボタン背景 */}
                <AnimatePresence>
                  {swipingId === alert.id && (
                    <motion.div
                      className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end pr-4 z-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Trash2 size={20} color="white" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 通知アイテム */}
                <motion.div
                  className="p-3 rounded-2xl flex gap-3 relative z-10 cursor-pointer"
                  style={{
                    background: "var(--surface-bg)",
                    border: "1px solid var(--surface-border)",
                  }}
                  drag="x"
                  dragConstraints={{ left: -100, right: 0 }}
                  dragElastic={0.2}
                  onDragStart={() => setSwipingId(alert.id)}
                  onDragEnd={(e, info) => {
                    if (info.offset.x < -50) {
                      handleDelete(alert.id);
                    }
                    setSwipingId(null);
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        "color-mix(in srgb, #f59e0b 20%, transparent)",
                    }}
                  >
                    <AlertCircle size={20} style={{ color: "#f59e0b" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-bold truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {alert.ingredient?.name}の賞味期限が近いです
                    </div>
                    <div
                      className="text-[11px] mt-0.5 flex items-center gap-1"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      <Calendar size={12} />
                      期限:{" "}
                      {alert.ingredient?.expirationDate
                        ? new Date(
                            alert.ingredient.expirationDate,
                          ).toLocaleDateString("ja-JP")
                        : "未設定"}
                    </div>
                    <div
                      className="text-[10px] mt-2"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {new Date(alert.lastAlertedAt).toLocaleString("ja-JP")}
                    </div>
                    <button
                      onClick={handleGenerateMenu}
                      className="mt-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition"
                      style={{
                        background: "var(--accent)",
                        color: "#fff",
                      }}
                    >
                      <ChefHat size={12} />
                      献立を生成しましょう
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
