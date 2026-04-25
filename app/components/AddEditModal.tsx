// app/components/AddEditModal.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { ja } from "date-fns/locale";
import { Ingredient } from "@/types";
import { useNativeSelect } from "@/app/hooks/useNativeSelect";
registerLocale("ja", ja);

// Zodスキーマ定義
const addEditSchema = z.object({
  name: z.string().min(1, "食材名を入力してください"),
  amountMode: z.enum(["precise", "rough"]),
  amount: z.number().nullable(),
  amountLevel: z.enum(["たっぷり", "普通", "少ない", "ほぼない"]),
  unit: z.string(),
  expirationDate: z.date().nullable(),
  noExpiry: z.boolean(),
  category: z.string(),
});

type AddEditFormData = z.infer<typeof addEditSchema>;

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
  const [pickerOpen, setPickerOpen] = useState(false);

  // AI Estimation state
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimatedExpiry, setEstimatedExpiry] = useState<string | null>(null);
  const [estimatedCategory, setEstimatedCategory] = useState<string | null>(null);
  const [estimatedAmount, setEstimatedAmount] = useState<number | null>(null);
  const [estimatedUnit, setEstimatedUnit] = useState<string | null>(null);
  const [daysFromPurchase, setDaysFromPurchase] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AddEditFormData>({
    resolver: zodResolver(addEditSchema),
    defaultValues: {
      name: item?.name ?? "",
      amountMode: item?.amountLevel ? "rough" : "precise",
      amount: item?.amount ?? item?.quantity ?? null,
      amountLevel: (item?.amountLevel as any) ?? "普通",
      unit: item?.unit ?? "個",
      expirationDate: item?.expirationDate ? new Date(item.expirationDate) : null,
      noExpiry: !item?.expirationDate,
      category: item?.category ?? "その他",
    },
  });

  // Watch form values
  const name = watch("name");
  const amountMode = watch("amountMode");
  const amount = watch("amount");
  const unit = watch("unit");
  const noExpiry = watch("noExpiry");
  const expiry = watch("expirationDate");

  // Reset form when item changes
  useEffect(() => {
    reset({
      name: item?.name ?? "",
      amountMode: item?.amountLevel ? "rough" : "precise",
      amount: item?.amount ?? item?.quantity ?? null,
      amountLevel: (item?.amountLevel as any) ?? "普通",
      unit: item?.unit ?? "個",
      expirationDate: item?.expirationDate ? new Date(item.expirationDate) : null,
      noExpiry: !item?.expirationDate,
      category: item?.category ?? "その他",
    });
    setEstimatedExpiry(null);
    setEstimatedCategory(null);
    setEstimatedAmount(null);
    setEstimatedUnit(null);
    setDaysFromPurchase(null);
  }, [item, reset]);

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
          setValue("expirationDate", new Date(data.estimatedExpiration));
          setValue("noExpiry", false);

          // カテゴリ推定結果を設定
          if (data.estimatedCategory) {
            setEstimatedCategory(data.estimatedCategory);
            setValue("category", data.estimatedCategory);
          }

          // 数量・単位推定結果を設定 (未入力時のみ)
          if (data.estimatedAmount && data.estimatedUnit) {
            setEstimatedAmount(data.estimatedAmount);
            setEstimatedUnit(data.estimatedUnit);

            // ユーザーがまだ何も入力していない場合のみ自動セット
            if (!amount && unit === "個") { // Default unit is "個"
              setValue("amount", data.estimatedAmount);
              setValue("unit", data.estimatedUnit);
              setValue("amountMode", "precise"); // 詳細モードへ
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

  const onSubmit = async (data: AddEditFormData) => {
    if (!data.name.trim()) return;

    // 内容量のバリデーション
    if (data.amountMode === "precise" && (!data.amount || data.amount === 0)) {
      alert("内容量を入力してください");
      return;
    }

    const payload = {
      name: data.name.trim(),
      category: data.category,
      expirationDate: data.noExpiry
        ? null
        : data.expirationDate
          ? data.expirationDate.toISOString()
          : null,
      amount: data.amountMode === "precise" ? Number(data.amount || 0) : null,
      amountLevel: data.amountMode === "rough" ? data.amountLevel : null,
      unit: data.amountMode === "precise" ? data.unit : null,
      ingredientType: "raw" as const,
      quantity:
        data.amountMode === "precise"
          ? Number(data.amount || 0)
          : data.amountMode === "rough"
            ? 0
            : (item?.quantity ?? 0),
    };
    if (item?.id) (payload as any).id = item.id;
    await onSave(payload as any);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-[var(--color-text-primary)]">
      <div className="text-lg font-semibold">
        {item ? "編集" : "追加"} - 食材
      </div>

      {/* 食材名 */}
      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
        食材名{" "}
        {isEstimating && (
          <span className="animate-pulse text-xs" style={{ color: "var(--accent)" }}>
            (推定中...)
          </span>
        )}
      </label>
      <input
        {...register("name")}
        placeholder="例：鶏むね肉"
        className="input-field w-full"
      />
      {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}

      {/* AI Estimation Feedback */}
      {estimatedExpiry && (
        <div className="text-xs px-2 py-1 rounded-lg flex flex-col gap-1 animate-in fade-in slide-in-from-top-1" style={{
          color: "var(--accent)",
          backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)"
        }}>
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
          type="button"
          onClick={() => setValue("amountMode", "precise")}
          className={`flex-1 py-1 text-xs rounded-lg transition ${amountMode === "precise" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--color-text-secondary)]"}`}
          style={amountMode !== "precise" ? {
            backgroundColor: 'var(--surface-bg)'
          } as React.CSSProperties : {}}
        >
          詳細
        </button>
        <button
          type="button"
          onClick={() => setValue("amountMode", "rough")}
          className={`flex-1 py-1 text-xs rounded-lg transition ${amountMode === "rough" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--color-text-secondary)]"}`}
          style={amountMode !== "rough" ? {
            backgroundColor: 'var(--surface-bg)'
          } as React.CSSProperties : {}}
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
                {...register("amount", { valueAsNumber: true })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                単位
              </label>
              <input
                {...register("unit")}
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
              {...register("amountLevel")}
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

      {/* カテゴリ (不要とのことで非表示、内部的には推定結果を保持) */}
      <div className="hidden">
        <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
          カテゴリ
        </label>
        <select
          {...register("category")}
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

      {/* 期限 */}
      <div className="pt-2">
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            {...register("noExpiry")}
            className="w-4 h-4 rounded border-[var(--surface-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          期限なし
        </label>

        {!noExpiry && (
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={() => setPickerOpen(!pickerOpen)}
              className="w-full rounded-xl border px-3 py-2 text-sm text-left text-[var(--color-text-primary)] border-[var(--surface-border)] bg-[var(--surface-bg)]"
            >
              {expiry ? expiry.toLocaleDateString("ja-JP") : "日付を選択"}
            </button>

            {pickerOpen && (
              <div className="relative mt-2 z-50 flex justify-center">
                <Controller
                  name="expirationDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      selected={field.value ?? new Date()}
                      onChange={(date: Date | null) => {
                        field.onChange(date);
                        setPickerOpen(false);
                        setEstimatedExpiry(null);
                      }}
                      inline
                      dateFormat="yyyy/MM/dd"
                      locale="ja"
                    />
                  )}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ボタン */}
      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 mr-2 border border-[var(--surface-border)] bg-[var(--surface-bg)] hover:brightness-105 text-[var(--color-text-secondary)] rounded-full py-2.5 text-sm font-medium transition"
        >
          キャンセル
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`flex-1 ml-2 rounded-full py-2.5 text-sm font-medium shadow-sm transition ${isSubmitting
            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
            : "bg-[var(--accent)] hover:brightness-110 text-white"
            }`}
        >
          {isSubmitting ? (
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
    </form>
  );
}
