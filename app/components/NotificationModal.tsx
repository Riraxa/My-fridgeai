//app/components/NotificationModal.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { X, Bell, Calendar, AlertCircle, Trash2, ChefHat } from "lucide-react";
import {
  motion,
  useMotionValue,
  useTransform,
  PanInfo,
} from "framer-motion";
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

const DELETE_BUTTON_WIDTH = 72;
const REVEAL_THRESHOLD = -50;
const FULL_DELETE_THRESHOLD = -200;

function SwipeableNotificationItem({
  alert,
  revealedId,
  setRevealedId,
  deletingIds,
  onDelete,
  onGenerateMenu,
}: {
  alert: Alert;
  revealedId: string | null;
  setRevealedId: (id: string | null) => void;
  deletingIds: Set<string>;
  onDelete: (id: string) => void;
  onGenerateMenu: () => void;
}) {
  const x = useMotionValue(0);
  const isRevealed = revealedId === alert.id;
  const isDeleting = deletingIds.has(alert.id);

  // Background delete button opacity: visible when dragging left or revealed
  const deleteButtonOpacity = useTransform(x, [-DELETE_BUTTON_WIDTH, 0], [1, 0]);

  // Snap to revealed position when revealedId changes
  useEffect(() => {
    if (isRevealed) {
      x.set(-DELETE_BUTTON_WIDTH);
    } else {
      x.set(0);
    }
  }, [isRevealed, x]);

  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const offsetX = info.offset.x;

      if (offsetX < FULL_DELETE_THRESHOLD) {
        // Full swipe → delete immediately
        onDelete(alert.id);
        setRevealedId(null);
      } else if (offsetX < REVEAL_THRESHOLD) {
        // Partial swipe → reveal delete button
        setRevealedId(alert.id);
      } else {
        // Swipe not far enough → close
        setRevealedId(null);
      }
    },
    [alert.id, onDelete, setRevealedId],
  );

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl"
      initial={{ height: "auto", opacity: 1 }}
      animate={{
        height: isDeleting ? 0 : "auto",
        opacity: isDeleting ? 0 : 1,
        marginBottom: isDeleting ? 0 : undefined,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* 削除ボタン背景 (常に背面に存在) */}
      <motion.div
        className="absolute inset-0 rounded-2xl flex items-center justify-end z-0"
        style={{
          background: "#ef4444",
          opacity: deleteButtonOpacity,
        }}
      >
        <button
          onClick={() => onDelete(alert.id)}
          className="flex flex-col items-center justify-center gap-1 h-full px-4"
          style={{ width: `${DELETE_BUTTON_WIDTH}px` }}
        >
          <Trash2 size={20} color="white" />
          <span className="text-[10px] text-white font-medium">削除</span>
        </button>
      </motion.div>

      {/* 通知アイテム (ドラッグ可能) */}
      <motion.div
        className="p-3 rounded-2xl flex gap-3 relative z-10 cursor-pointer"
        style={{
          background: "var(--surface-bg)",
          border: "1px solid var(--surface-border)",
          x,
        }}
        drag="x"
        dragConstraints={{ left: -300, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
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
            onClick={onGenerateMenu}
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
  );
}

export default function NotificationModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setAlerts(data.alerts ?? []);
        }
      } catch (e) {
        console.error("Failed to fetch notifications", e);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  const handleDelete = useCallback(async (alertId: string) => {
    setDeletingIds((prev) => new Set(prev).add(alertId));
    try {
      const res = await fetch(`/api/notifications?id=${alertId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTimeout(() => {
          setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
        }, 300);
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
  }, []);

  const handleGenerateMenu = useCallback(() => {
    onClose();
    router.push("/menu/generate");
  }, [onClose, router]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setRevealedId(null)}
    >
      <motion.div
        className="w-full max-w-sm modal-card shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={springTransition}
        onClick={(e) => e.stopPropagation()}
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
              <SwipeableNotificationItem
                key={alert.id}
                alert={alert}
                revealedId={revealedId}
                setRevealedId={setRevealedId}
                deletingIds={deletingIds}
                onDelete={handleDelete}
                onGenerateMenu={handleGenerateMenu}
              />
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

