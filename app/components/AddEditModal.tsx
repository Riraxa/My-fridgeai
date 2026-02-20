// app/components/AddEditModal.tsx
"use client";
import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { ja } from "date-fns/locale";
import { Ingredient, IngredientType } from "@/types";
import { useNativeSelect } from "@/app/hooks/useNativeSelect";
registerLocale("ja", ja);

export default function AddEditModal({
  item,
  onSave,
  onCancel,
}: {
  item: Ingredient | null;
  onSave: (it: Ingredient) => void;
  onCancel: () => void;
}) {
  const { getSelectClassName } = useNativeSelect();
  const [name, setName] = useState(item?.name ?? "");
  const [amountMode, setAmountMode] = useState<"precise" | "rough">(
    "precise", // 常に詳細モードから開始
  );
  const [amount, setAmount] = useState<number | "">(
    item?.amount ?? item?.quantity ?? "", // amountを優先、quantityはfallback
    // 新規時は空で初期化
  );
  const [amountLevel, setAmountLevel] = useState(item?.amountLevel ?? "普通");
  const [unit, setUnit] = useState(item?.unit ?? "個");
  const [expiry, setExpiry] = useState<Date | null>(
    item?.expirationDate ? new Date(item.expirationDate) : null,
  );
  const [noExpiry, setNoExpiry] = useState<boolean>(!item?.expirationDate);
  const [category, setCategory] = useState(item?.category ?? "その他");
  const [ingredientType, setIngredientType] = useState<IngredientType>(
    item?.ingredientType ?? "raw",
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  // AI Estimation state
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimatedExpiry, setEstimatedExpiry] = useState<string | null>(null);
  const [estimatedCategory, setEstimatedCategory] = useState<string | null>(
    null,
  );
  const [estimatedAmount, setEstimatedAmount] = useState<number | null>(null); // New
  const [estimatedUnit, setEstimatedUnit] = useState<string | null>(null); // New
  const [daysFromPurchase, setDaysFromPurchase] = useState<number | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(item?.name ?? "");
    setAmountMode(item?.amountLevel ? "rough" : "precise");
    setAmount(item?.amount ?? item?.quantity ?? (item ? "" : "")); // amountを優先
    setAmountLevel(item?.amountLevel ?? "普通");
    setUnit(item?.unit ?? "個");
    const date = item?.expirationDate ? new Date(item.expirationDate) : null;
    setExpiry(date);
    setNoExpiry(!date);
    setCategory(item?.category ?? "その他");
    setIngredientType(item?.ingredientType ?? "raw");
    setEstimatedExpiry(null);
    setEstimatedCategory(null);
    setEstimatedAmount(null);
    setEstimatedUnit(null);
    setDaysFromPurchase(null);
  }, [item]);

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

          // 数量・単位推定結果を設定 (未入力時のみ)
          if (data.estimatedAmount && data.estimatedUnit) {
            setEstimatedAmount(data.estimatedAmount);
            setEstimatedUnit(data.estimatedUnit);

            // ユーザーがまだ何も入力していない場合のみ自動セット
            if (!amount && unit === "個") { // Default unit is "個"
              setAmount(data.estimatedAmount);
              setUnit(data.estimatedUnit);
              setAmountMode("precise"); // 詳細モードへ
            }
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
        {item ? "編集" : "追加"} - {ingredientType === "raw" ? "食材" : "加工食品"}
      </div>

      {/* 食材タイプ選択 */}
      <div className="flex gap-1 p-1 bg-[var(--surface-bg)] rounded-xl border border-[var(--surface-border)]">
        <button
          onClick={() => setIngredientType("raw")}
          className={`flex-1 py-1.5 text-xs rounded-lg transition ${ingredientType === "raw" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--color-text-secondary)] hover:bg-gray-100"}`}
        >
          🥬 通常食材
        </button>
        <button
          onClick={() => setIngredientType("processed_base")}
          className={`flex-1 py-1.5 text-xs rounded-lg transition ${ingredientType === "processed_base" ? "bg-orange-500 text-white shadow-sm" : "text-[var(--color-text-secondary)] hover:bg-gray-100"}`}
        >
          🍲 調理ベース
        </button>
        <button
          onClick={() => setIngredientType("instant_complete")}
          className={`flex-1 py-1.5 text-xs rounded-lg transition ${ingredientType === "instant_complete" ? "bg-blue-500 text-white shadow-sm" : "text-[var(--color-text-secondary)] hover:bg-gray-100"}`}
        >
          ⚡ そのまま
        </button>
      </div>

      {/* 加工食品ヒント */}
      {ingredientType !== "raw" && (
        <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg">
          ※詳細な商品名を入力するとAIの精度が向上します
        </div>
      )}

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
          {estimatedAmount && estimatedUnit && (
            <span>⚖️ 数量推定: {estimatedAmount}{estimatedUnit}</span>
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
                value={amount}
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
              className={getSelectClassName()}
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
            className={getSelectClassName()}
          >
            <option>冷蔵</option>
            <option>冷凍</option>
            <option>野菜</option>
            <option>調味料</option>
            <option>加工食品</option>
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
          <div className="mt-2 text-center">
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
                  onChange={(date: Date | null) => {
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
          onClick={async () => {
            if (!name.trim() || isSaving) return;

            // 内容量のバリデーション
            if (amountMode === "precise" && (amount === "" || amount === 0)) {
              alert("内容量を入力してください");
              return;
            }

            setIsSaving(true);
            try {
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
                ingredientType,
                quantity:
                  amountMode === "precise"
                    ? Number(amount || 0)
                    : amountMode === "rough"
                      ? 0
                      : (item?.quantity ?? 0), // Legacy: amountをコピーして後方互換性を維持
              };
              if (item?.id) payload.id = item.id;
              await onSave(payload);
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={isSaving}
          className={`flex-1 ml-2 rounded-full py-2.5 text-sm font-medium shadow-sm transition ${isSaving
            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
            : "bg-[var(--accent)] hover:brightness-110 text-white"
            }`}
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              追加中...
            </span>
          ) : item ? (
            "更新"
          ) : (
            "保存"
          )}
        </button>
      </div>
    </div>
  );
}
