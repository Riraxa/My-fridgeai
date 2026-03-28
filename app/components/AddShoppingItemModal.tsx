// app/components/AddShoppingItemModal.tsx
"use client";

import React, { useState } from "react";
// import { useEffect } from "react"; // 将来使用
import { ShoppingItem } from "@/types"; // 仮に types にあるとするか、直接定義

interface AddShoppingItemModalProps {
  item?: ShoppingItem | null;
  onSave: (item: ShoppingItem) => void;
  onCancel: () => void;
}

export default function AddShoppingItemModal({
  item,
  onSave,
  onCancel,
}: AddShoppingItemModalProps) {
  const [name, setName] = useState(item?.name ?? "");
  const [quantity, setQuantity] = useState<string | number>(
    item?.quantity ?? "",
  );
  const [unit, setUnit] = useState(item?.unit ?? "");
  const [note, setNote] = useState(item?.note ?? "");

  const handleSave = () => {
    if (!name.trim()) {
      alert("名前を入力してください");
      return;
    }
    const newItem = {
      ...item,
      id: item?.id ?? `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      quantity: quantity,
      unit: unit,
      note: note.trim(),
      done: item?.done ?? false,
    };
    onSave(newItem);
  };

  return (
    <div className="space-y-4 text-[var(--color-text-primary)]">
      <div className="text-lg font-semibold">
        {item ? "アイテムを編集" : "買い物リストに追加"}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
            品名
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 牛乳, たまねぎ"
            className="input-field w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              数量
            </label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="例: 1, 500"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              単位
            </label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="例: 個, ml"
              className="input-field w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
            メモ
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例: 安ければ買う"
            className="input-field w-full"
          />
        </div>
      </div>

      <div className="flex justify-between mt-6 gap-3">
        <button
          onClick={onCancel}
          className="flex-1 border border-[var(--surface-border)] bg-[var(--surface-bg)] hover:brightness-105 text-[var(--color-text-secondary)] rounded-full py-2.5 text-sm font-medium transition"
        >
          キャンセル
        </button>

        <button
          onClick={handleSave}
          className="flex-1 rounded-full py-2.5 text-sm font-medium shadow-sm transition bg-[var(--accent)] hover:brightness-110 text-white"
        >
          {item ? "更新" : "追加"}
        </button>
      </div>
    </div>
  );
}
