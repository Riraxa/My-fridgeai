// app/components/ShoppingListItem.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2, CheckCircle } from "lucide-react";

import { ShoppingItem } from "@/types";

interface ShoppingListItemProps {
  item: ShoppingItem;
  onToggle: () => void;
  onDelete: () => void;
  onEdit?: (item: ShoppingItem) => void; // 編集モーダル呼び出し用
  onRequestAdd?: (item: ShoppingItem) => void;
}

export default function ShoppingListItem({
  item,
  onToggle,
  onDelete,
  onEdit,
  onRequestAdd,
}: ShoppingListItemProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleCheck = () => {
    onToggle();
    if (!item.done && onRequestAdd) {
      onRequestAdd(item);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={`group flex items-center justify-between
        rounded-2xl border border-[var(--surface-border)] p-4 transition-all
        ${
          item.done
            ? "bg-[var(--surface-bg)] opacity-60"
            : "bg-[var(--background)]"
        } hover:shadow-sm`}
    >
      {/* 左側: チェック + 内容 */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button
          onClick={handleCheck}
          className={`flex-shrink-0 rounded-full p-0.5 transition-all ${
            item.done
              ? "text-green-500"
              : "text-[var(--color-text-muted)] hover:text-green-500"
          }`}
          aria-label={item.done ? "未完了にする" : "完了にする"}
        >
          <CheckCircle size={24} strokeWidth={item.done ? 3 : 2} />
        </button>

        <div className="flex flex-col min-w-0">
          <span
            className={`font-medium transition-all truncate ${item.done ? "line-through text-[var(--color-text-muted)]" : "text-[var(--color-text-primary)]"}`}
          >
            {item.name}
          </span>
          {(item.quantity ?? item.unit ?? item.note) && (
            <span className="text-xs text-[var(--color-text-muted)] truncate">
              {item.quantity && `${item.quantity}${item.unit ?? ""}`}
              {item.quantity && item.note && " • "}
              {item.note}
            </span>
          )}
        </div>
      </div>

      {/* 右側: 操作ボタン */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button
            onClick={() => onEdit(item)}
            className="p-2 rounded-full hover:bg-[var(--surface-bg)] text-[var(--color-text-muted)] hover:text-[var(--accent)] transition-all"
            aria-label="編集"
          >
            <Pencil size={18} />
          </button>
        )}

        <button
          onClick={onDelete}
          className="p-2 rounded-full hover:bg-red-50 text-[var(--color-text-muted)] hover:text-red-500 transition-all"
          aria-label="削除"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}
