"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, CalendarDays } from "lucide-react";
import { ExtractedIngredient } from "@/lib/agents/image-analyzer";
import { format, addDays } from "date-fns";

interface ImageRecognitionModalProps {
  initialItems: ExtractedIngredient[];
  onSaveBatch: (
    items: Array<ExtractedIngredient & { computedExpirationDate: string | null }>
  ) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const CATEGORIES = [
  "すべて",
  "冷蔵",
  "冷凍",
  "野菜",
  "調味料",
  "加工食品",
  "その他",
];
const UNITS = ["個", "本", "枚", "g", "ml", "パック", "袋", "束"];

export default function ImageRecognitionModal({
  initialItems,
  onSaveBatch,
  onCancel,
  isSaving = false,
}: ImageRecognitionModalProps) {
  // Add a unique ID for React keys and local state management
  const [items, setItems] = useState<
    Array<ExtractedIngredient & { localId: string; computedExpirationDate: string | null }>
  >([]);

  useEffect(() => {
    const today = new Date();
    const mapped = initialItems.map((item) => {
      let expDate = null;
      if (item.estimatedExpirationDays && item.estimatedExpirationDays > 0) {
        expDate = format(addDays(today, item.estimatedExpirationDays), "yyyy-MM-dd");
      }
      return {
        ...item,
        localId: Math.random().toString(36).substr(2, 9),
        computedExpirationDate: expDate,
      };
    });
    setItems(mapped);
  }, [initialItems]);

  const updateItem = (localId: string, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (localId: string) => {
    setItems((prev) => prev.filter((item) => item.localId !== localId));
  };

  const addNewItem = () => {
    setItems((prev) => [
      ...prev,
      {
        localId: Math.random().toString(36).substr(2, 9),
        name: "",
        category: "その他",
        quantity: 1,
        unit: "個",
        estimatedExpirationDays: 0,
        computedExpirationDate: null,
      },
    ]);
  };

  const handleSave = () => {
    // Filter out items with empty names BEFORE emitting
    const validItems = items.filter((i) => i.name.trim() !== "");
    onSaveBatch(validItems);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)] max-h-[85vh] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[var(--surface-border)] sticky top-0 bg-[var(--background)] z-10">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">解析結果の確認</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            AIが抽出した食材リストです。必要に応じて修正してください。
          </p>
        </div>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="p-2 bg-[var(--surface-bg)] rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--surface-border)] transition"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {items.length === 0 && (
          <div className="text-center py-8 text-[var(--color-text-muted)]">
            食材がありません。手動で追加してください。
          </div>
        )}
        
        {items.map((item, index) => (
          <div
            key={item.localId}
            className="card p-4 border border-[var(--surface-border)] flex flex-col gap-3 relative"
          >
            <div className="absolute top-3 right-3">
              <button
                onClick={() => removeItem(item.localId)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* 品名 */}
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] mb-1 block">
                  品名
                </label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(item.localId, "name", e.target.value)}
                  placeholder="例: にんじん"
                  className="w-full bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] text-[var(--color-text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* カテゴリ */}
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] mb-1 block">
                    カテゴリ
                  </label>
                  <select
                    value={item.category}
                    onChange={(e) => updateItem(item.localId, "category", e.target.value)}
                    className="w-full bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] text-[var(--color-text-primary)]"
                  >
                    {CATEGORIES.filter((c) => c !== "すべて").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 数量・単位 */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-[var(--color-text-muted)] mb-1 block">
                      数量
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.localId, "quantity", parseFloat(e.target.value) || 1)
                      }
                      className="w-full bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] text-[var(--color-text-primary)]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-[var(--color-text-muted)] mb-1 block">
                      単位
                    </label>
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(item.localId, "unit", e.target.value)}
                      className="w-full bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] text-[var(--color-text-primary)]"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 賞味期限 */}
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] mb-1 block flex items-center gap-1">
                  <CalendarDays size={12} /> 賞味・消費期限
                </label>
                <input
                  type="date"
                  value={item.computedExpirationDate || ""}
                  onChange={(e) => updateItem(item.localId, "computedExpirationDate", e.target.value || null)}
                  className="w-full bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] text-[var(--color-text-primary)]"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addNewItem}
          className="w-full py-3 border-2 border-dashed border-[var(--surface-border)] rounded-xl text-[var(--color-text-secondary)] font-medium flex items-center justify-center gap-2 hover:bg-[var(--surface-bg)] hover:text-[var(--accent)] transition-colors"
        >
          <Plus size={18} /> 食材を追加する
        </button>
      </div>

      <div className="p-4 border-t border-[var(--surface-border)] bg-[var(--background)] sticky bottom-0 z-10">
        <button
          onClick={handleSave}
          disabled={isSaving || items.length === 0}
          className="w-full py-3.5 bg-[var(--accent)] text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              保存中...
            </>
          ) : (
            `すべて追加 (${items.filter((i) => i.name.trim() !== "").length}件)`
          )}
        </button>
      </div>
    </div>
  );
}
