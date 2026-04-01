"use client";

import React from "react";
import { Check, AlertTriangle } from "lucide-react";
import { ParsedItem } from "./types";

interface ResultsViewProps {
  items: ParsedItem[];
  selectAll: () => void;
  deselectAll: () => void;
  toggleItemAction: (index: number) => void;
  updateItemName: (index: number, name: string) => void;
  updateItemQuantity: (index: number, qty: number) => void;
  updateItemUnit: (index: number, unit: string) => void;
}

export default function ResultsView({
  items,
  selectAll,
  deselectAll,
  toggleItemAction,
  updateItemName,
  updateItemQuantity,
  updateItemUnit,
}: ResultsViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">検出された食材 ({items.length}件)</h2>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-xs px-3 py-1 rounded-full transition"
            style={{ background: "var(--surface-bg)", border: "1px solid var(--surface-border)" }}
          >
            全選択
          </button>
          <button
            onClick={deselectAll}
            className="text-xs px-3 py-1 rounded-full transition"
            style={{ background: "var(--surface-bg)", border: "1px solid var(--surface-border)" }}
          >
            全解除
          </button>
        </div>
      </div>

      <div className="space-y-2 overflow-visible">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="rounded-xl p-3 transition overflow-visible"
            style={{
              background: item.action === "add" ? "var(--surface-bg)" : "transparent",
              border: `1px solid ${item.action === "add" ? "var(--surface-border)" : "var(--surface-border)"}`,
              opacity: item.action === "skip" ? 0.5 : 1,
            }}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggleItemAction(idx)}
                className="mt-1 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition"
                style={{
                  background: item.action === "add" ? "var(--accent)" : "transparent",
                  border: `2px solid ${item.action === "add" ? "var(--accent)" : "var(--color-text-muted)"}`,
                }}
              >
                {item.action === "add" && <Check size={14} className="text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <input
                  value={item.editedName}
                  onChange={(e) => updateItemName(idx, e.target.value)}
                  className="w-full text-base font-bold bg-transparent border-none outline-none"
                  style={{ color: "var(--color-text-primary)" }}
                  placeholder="食材名"
                />

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-transparent rounded-lg px-2 py-1" style={{ border: "1px solid var(--surface-border)" }}>
                    <input
                      type="number"
                      value={item.editedQuantity ?? ""}
                      onChange={(e) => updateItemQuantity(idx, parseFloat(e.target.value) || 0)}
                      className="w-12 text-sm bg-transparent outline-none"
                      style={{ color: "var(--color-text-primary)" }}
                      placeholder="1"
                    />
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>×</span>
                    <select
                      value={item.editedUnit ?? "個"}
                      onChange={(e) => updateItemUnit(idx, e.target.value)}
                      className="text-sm bg-transparent outline-none pr-4 relative z-50"
                      style={{ 
                        color: "var(--color-text-primary)",
                        backgroundColor: "var(--surface-bg)"
                      }}
                    >
                      <option value="個">個</option>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="L">L</option>
                      <option value="dl">dl</option>
                      <option value="本">本</option>
                      <option value="枚">枚</option>
                      <option value="袋">袋</option>
                      <option value="パック">パック</option>
                    </select>
                  </div>

                  {item.confidenceScore < 0.7 && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: "#f59e0b" }}>
                      <AlertTriangle size={12} />
                      要確認
                    </span>
                  )}

                  {item.mappedIngredientName && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--accent)", color: "#fff", opacity: 0.8 }}>
                      既存: {item.mappedIngredientName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
