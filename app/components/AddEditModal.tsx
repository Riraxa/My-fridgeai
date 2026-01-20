// app/components/AddEditModal.tsx
"use client";
import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { ja } from "date-fns/locale";
registerLocale("ja", ja);

export default function AddEditModal({
  item,
  onSave,
  onCancel,
}: {
  item: any | null;
  onSave: (it: any) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [amountMode, setAmountMode] = useState<"precise" | "rough">(
    item?.amountLevel ? "rough" : "precise",
  );
  const [amount, setAmount] = useState<number | "">(
    item?.amount ?? item?.quantity ?? 1,
  );
  const [amountLevel, setAmountLevel] = useState(item?.amountLevel ?? "普通");
  const [unit, setUnit] = useState(item?.unit ?? "個");
  const [expiry, setExpiry] = useState<Date | null>(
    item?.expirationDate
      ? new Date(item.expirationDate)
      : item?.expiry
        ? new Date(item.expiry)
        : null,
  );
  const [noExpiry, setNoExpiry] = useState<boolean>(
    !item?.expirationDate && !item?.expiry,
  );
  const [category, setCategory] = useState(item?.category ?? "その他");
  const [pickerOpen, setPickerOpen] = useState(false);

  // AI Estimation state
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimatedExpiry, setEstimatedExpiry] = useState<string | null>(null);
  const [estimatedCategory, setEstimatedCategory] = useState<string | null>(
    null,
  );
  const [daysFromPurchase, setDaysFromPurchase] = useState<number | null>(null);

  useEffect(() => {
    setName(item?.name ?? "");
    setAmountMode(item?.amountLevel ? "rough" : "precise");
    setAmount(item?.amount ?? item?.quantity ?? 1);
    setAmountLevel(item?.amountLevel ?? "普通");
    setUnit(item?.unit ?? "個");
    const date = item?.expirationDate
      ? new Date(item.expirationDate)
      : item?.expiry
        ? new Date(item.expiry)
        : null;
    setExpiry(date);
    // Only set noExpiry if there's no AI estimation in progress
    if (!estimatedExpiry) {
      setNoExpiry(!date);
    }
    setCategory(item?.category ?? "その他");
    setEstimatedExpiry(null);
    setEstimatedCategory(null);
    setDaysFromPurchase(null);
  }, [item, estimatedExpiry]);

  // Debounced estimation - only for new items (not editing)
  useEffect(() => {
    // Skip if editing existing item or name too short
    if (item?.id || !name || name.length < 2) return;

    // Skip if name is same as original item name
    if (item?.name === name) return;

    const timer = setTimeout(async () => {
      setIsEstimating(true);
      try {
        const res = await fetch("/api/ingredients/estimate-expiration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (data.success && data.estimatedExpiration) {
          setEstimatedExpiry(data.estimatedExpiration);
          setExpiry(new Date(data.estimatedExpiration));
          setNoExpiry(false);

          // カテゴリ推定結果を設定
          if (data.estimatedCategory) {
            setEstimatedCategory(data.estimatedCategory);
            setCategory(data.estimatedCategory);
          }

          const days = Math.ceil(
            (new Date(data.estimatedExpiration).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          );
          setDaysFromPurchase(days);
        }
      } catch (e) {
        console.error("Estimation failed", e);
      } finally {
        setIsEstimating(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [name, item]);

  return (
    <div className="space-y-3 text-[var(--color-text-primary)]">
      <div className="text-lg font-semibold">
        {item ? "編集" : "追加"} - 食材
      </div>

      {/* 食材名 */}
      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
        食材名{" "}
        {isEstimating && (
          <span className="animate-pulse text-xs text-indigo-500">
            (推定中...)
          </span>
        )}
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="例：鶏むね肉"
        className="input-field w-full"
      />

      {/* AI Estimation Feedback */}
      {estimatedExpiry && (
        <div className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg flex flex-col gap-1 animate-in fade-in slide-in-from-top-1">
          <span>
            ✨ 賞味期限推定:{" "}
            {new Date(estimatedExpiry).toLocaleDateString("ja-JP")} (
            {daysFromPurchase}日後)
          </span>
          {estimatedCategory && (
            <span>📂 カテゴリ推定: {estimatedCategory}</span>
          )}
        </div>
      )}

      {/* 数量モード切替 */}
      <div className="flex gap-2 p-1 bg-[var(--surface-bg)] rounded-xl border border-[var(--surface-border)] mt-4">
        <button
          onClick={() => setAmountMode("precise")}
          className={`flex-1 py-1 text-xs rounded-lg transition ${amountMode === "precise" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--color-text-secondary)] hover:bg-gray-100"}`}
        >
          詳細
        </button>
        <button
          onClick={() => setAmountMode("rough")}
          className={`flex-1 py-1 text-xs rounded-lg transition ${amountMode === "rough" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--color-text-secondary)] hover:bg-gray-100"}`}
        >
          ざっくり
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {amountMode === "precise" ? (
          <>
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                数量
              </label>
              <input
                type="number"
                value={amount as any}
                onChange={(e) =>
                  setAmount(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                単位
              </label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="g, ml, 個"
                className="input-field w-full"
              />
            </div>
          </>
        ) : (
          <div className="col-span-2">
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              残量レベル
            </label>
            <select
              value={amountLevel}
              onChange={(e) => setAmountLevel(e.target.value)}
              className="input-field w-full"
            >
              <option value="たっぷり">たっぷり</option>
              <option value="普通">普通</option>
              <option value="少ない">少ない</option>
              <option value="ほぼない">ほぼない</option>
            </select>
          </div>
        )}
      </div>

      {/* カテゴリ */}
      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
            カテゴリ{" "}
            {estimatedCategory && (
              <span className="text-indigo-500">(AI推定)</span>
            )}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field w-full"
          >
            <option>冷蔵</option>
            <option>冷凍</option>
            <option>野菜</option>
            <option>調味料</option>
            <option>その他</option>
          </select>
        </div>
      </div>

      {/* 期限 */}
      <div className="pt-2">
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-[var(--surface-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
            checked={noExpiry}
            onChange={(e) => setNoExpiry(e.target.checked)}
          />
          期限なし
        </label>

        {!noExpiry && (
          <div className="mt-2">
            <button
              onClick={() => setPickerOpen(!pickerOpen)}
              className="w-full rounded-xl border px-3 py-2 text-sm text-left text-[var(--color-text-primary)] border-[var(--surface-border)] bg-[var(--surface-bg)]"
            >
              {expiry ? expiry.toLocaleDateString("ja-JP") : "日付を選択"}
            </button>

            {pickerOpen && (
              <div className="relative mt-2 z-50 flex justify-center">
                <DatePicker
                  selected={expiry || new Date()}
                  onChange={(date) => {
                    setExpiry(date);
                    setPickerOpen(false);
                    setEstimatedExpiry(null); // Clear manual edit
                  }}
                  inline
                  dateFormat="yyyy/MM/dd"
                  locale="ja"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ボタン */}
      <div className="flex justify-between mt-6">
        <button
          onClick={onCancel}
          className="flex-1 mr-2 border border-[var(--surface-border)] bg-[var(--surface-bg)] hover:brightness-105 text-[var(--color-text-secondary)] rounded-full py-2.5 text-sm font-medium transition"
        >
          キャンセル
        </button>

        <button
          onClick={() => {
            if (!name.trim()) return;
            const payload: any = {
              name: name.trim(),
              category,
              expirationDate: noExpiry
                ? null
                : expiry
                  ? expiry.toISOString()
                  : null,
              amount: amountMode === "precise" ? Number(amount || 0) : null,
              amountLevel: amountMode === "rough" ? amountLevel : null,
              unit: amountMode === "precise" ? unit : null,
              quantity: amountMode === "precise" ? Number(amount || 0) : 0, // Legacy support
            };
            if (item?.id) payload.id = item.id;
            onSave(payload);
          }}
          className="flex-1 ml-2 bg-[var(--accent)] hover:brightness-110 text-white rounded-full py-2.5 text-sm font-medium shadow-sm transition"
        >
          {item ? "更新" : "保存"}
        </button>
      </div>
    </div>
  );
}
