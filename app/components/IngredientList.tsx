//app/components/IngredientList.tsx
"use client";
import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, Trash2, Edit3 } from "lucide-react";
import { useFridge } from "./FridgeProvider";
import AddEditModal from "./AddEditModal";
import { createPortal } from "react-dom";
import { Ingredient } from "@/types";

interface IngredientListProps {
  searchQuery?: string;
  filteredItems?: Ingredient[];
}

export default function IngredientList({
  searchQuery,
  filteredItems,
}: IngredientListProps) {
  const { items, addOrUpdateItem, deleteItem } = useFridge();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const openAddHandler = () => setEditingItem(null);
    window.addEventListener("fridge_open_add", openAddHandler as any);
    return () =>
      window.removeEventListener("fridge_open_add", openAddHandler as any);
  }, []);

  // Use filtered items if provided, otherwise use all items sorted by expiration
  const displayItems = useMemo(() => {
    const source = filteredItems ?? items ?? [];
    return [...source].sort((a, b) => {
      const dateA = a.expirationDate
        ? new Date(a.expirationDate).getTime()
        : Infinity;
      const dateB = b.expirationDate
        ? new Date(b.expirationDate).getTime()
        : Infinity;
      return dateA - dateB;
    });
  }, [filteredItems, items]);

  const getExpiryBadge = (expirationDate: string | Date | null | undefined) => {
    const dateStr = expirationDate;
    if (!dateStr)
      return (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ color: "var(--color-text-muted)" }}
        >
          期限未設定
        </span>
      );

    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0)
      return (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: "var(--color-text-muted)", color: "#fff" }}
        >
          期限切れ
        </span>
      );
    if (days <= 1)
      return (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: "#ef4444", color: "#fff" }}
        >
          🔴 あと{days}日
        </span>
      );
    if (days <= 3)
      return (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: "#f59e0b", color: "#fff" }}
        >
          🟡 あと{days}日
        </span>
      );
    if (days <= 7)
      return (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: "#6366f1", color: "#fff" }}
        >
          🔵 あと{days}日
        </span>
      );
    return (
      <span
        className="text-[10px] px-1.5 py-0.5 rounded"
        style={{ background: "#10b981", color: "#fff" }}
      >
        🟢 あと{days}日
      </span>
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm("この食材を削除しますか？")) return;
    deleteItem(id);
    setExpandedId(null);
  };

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (!mounted) {
    return (
      <div className="divide-y divide-[var(--surface-border)]">
        <div
          className="p-4 text-center text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--surface-border)]">
      {!displayItems || displayItems.length === 0 ? (
        <div
          className="p-8 text-center text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          {searchQuery
            ? `「${searchQuery}」に一致する食材がありません。`
            : "まだ食材がありません。右上の「＋」ボタンから追加してください。"}
        </div>
      ) : (
        displayItems.map((it) => (
          <div key={it.id} className="relative transition">
            <div className="flex items-center justify-between px-3 py-3">
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="font-semibold truncate text-sm"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {it.name}
                  </div>
                  {getExpiryBadge(it.expirationDate)}
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="text-xs font-medium"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {it.amountLevel ? (
                      <span style={{ color: "var(--accent)" }}>
                        {it.amountLevel}
                      </span>
                    ) : (
                      <span>
                        {it.amount ?? it.quantity}
                        {it.unit || ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {expandedId === it.id && (
                  <div className="flex gap-1 mr-1">
                    <button
                      onClick={() => {
                        if (it.id) {
                          setEditingItem(it);
                          setExpandedId(null);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm transition"
                      style={{
                        background: "var(--surface-bg)",
                        border: "1px solid var(--surface-border)",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      <Edit3 size={14} style={{ color: "var(--accent)" }} />
                      <span>編集</span>
                    </button>
                    <button
                      onClick={() => it.id && handleDelete(it.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm transition"
                      style={{
                        background: "var(--surface-bg)",
                        border: "1px solid #fecaca",
                        color: "#dc2626",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#fef2f2";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--surface-bg)";
                      }}
                    >
                      <Trash2 size={14} />
                      <span>削除</span>
                    </button>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (it.id) {
                      handleToggle(it.id);
                    }
                  }}
                  className={`rounded-full p-2 transition ${expandedId === it.id ? "" : "hover:bg-gray-50/50"}`}
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {editingItem !== null && (
              <motion.div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="relative w-full max-w-sm rounded-[2rem] shadow-2xl bg-[var(--background)] p-6"
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                  <AddEditModal
                    item={editingItem}
                    onSave={(it: Ingredient) => {
                      addOrUpdateItem(it);
                      setEditingItem(null);
                    }}
                    onCancel={() => setEditingItem(null)}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
