//app/components/NotificationModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { X, Bell, Calendar, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { springTransition } from "./motion";

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
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

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
              <div
                key={alert.id}
                className="p-3 rounded-2xl flex gap-3"
                style={{
                  background: "var(--surface-bg)",
                  border: "1px solid var(--surface-border)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "color-mix(in srgb, #f59e0b 20%, transparent)",
                  }}
                >
                  <AlertCircle size={20} style={{ color: "#f59e0b" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-bold truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    賞味期限アラート: {alert.ingredient?.name || "食材"}
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
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
