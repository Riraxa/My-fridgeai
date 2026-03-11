// GENERATED_BY_AI: 2026-03-11 Antigravity
// app/components/ReceiptScanner.tsx
// Receipt upload & scan component.
// Supports camera capture (mobile) and file upload.

"use client";

import React, { useRef, useState, useCallback } from "react";
import { useFridge } from "./FridgeProvider";
import { X, Camera, Upload, Check, Trash2, Edit3, AlertTriangle, Receipt } from "lucide-react";

interface ParsedItem {
  id: string;
  lineText: string;
  productName: string | null;
  normalizedName: string | null;
  mappedIngredientId: string | null;
  mappedIngredientName: string | null;
  processedCategory: string | null;
  quantityValue: number | null;
  quantityUnit: string | null;
  inferredLevel: string | null;
  confidenceScore: number;
  // UI-only fields
  action: "add" | "skip";
  editedName: string;
  editedQuantity: number | null;
  editedUnit: string | null;
  editedCategory: string | null;
}

type ScanStep = "upload" | "scanning" | "results" | "confirming" | "done" | "error";

export default function ReceiptScanner({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ScanStep>("upload");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState("レシートを解析中...");
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const { fetchIngredients, setToast, setReceiptScanOpen } = useFridge();

  const resetState = useCallback(() => {
    setStep("upload");
    setItems([]);
    setReceiptId(null);
    setError(null);
    setResultMessage(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose?.();
  }, [resetState, onClose]);

  // --- Upload & OCR ---
  const handleFile = useCallback(async (file: File) => {
    if (!file) return;

    // Validate
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("対応形式: JPEG, PNG, WebP");
      setStep("error");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("画像サイズは4MB以下にしてください");
      setStep("error");
      return;
    }

    setStep("scanning");
    setScanMessage("レシートを解析中...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("idempotencyKey", `${Date.now()}-${Math.random().toString(36).slice(2)}`);

      const res = await fetch("/api/receipt/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "レシートの処理に失敗しました");
      }

      setReceiptId(data.receiptId);

      if (!data.items || data.items.length === 0) {
        setError("商品を検出できませんでした。別のレシートをお試しください。");
        setStep("error");
        return;
      }

      // Map to editable items
      const editableItems: ParsedItem[] = data.items.map((item: any) => ({
        ...item,
        action: "add" as const,
        editedName: item.normalizedName ?? item.productName ?? item.lineText,
        editedQuantity: item.quantityValue ?? 1,
        editedUnit: item.quantityUnit ?? "個",
        editedCategory: item.processedCategory === "processedFood" ? "加工食品" : "その他",
      }));

      setItems(editableItems);
      setStep("results");
    } catch (e: any) {
      console.error("Receipt upload error:", e);
      setError(e?.message ?? "レシートの処理中にエラーが発生しました");
      setStep("error");
    }
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ""; // reset
  }, [handleFile]);

  // --- Item editing ---
  const toggleItemAction = (index: number) => {
    setItems((prev) => {
      const next = [...prev];
      const item = next[index];
      if (item) next[index] = { ...item, action: item.action === "add" ? "skip" : "add" };
      return next;
    });
  };

  const updateItemName = (index: number, name: string) => {
    setItems((prev) => {
      const next = [...prev];
      const item = next[index];
      if (item) next[index] = { ...item, editedName: name };
      return next;
    });
  };

  const updateItemQuantity = (index: number, qty: number) => {
    setItems((prev) => {
      const next = [...prev];
      const item = next[index];
      if (item) next[index] = { ...item, editedQuantity: qty };
      return next;
    });
  };

  const updateItemUnit = (index: number, unit: string) => {
    setItems((prev) => {
      const next = [...prev];
      const item = next[index];
      if (item) next[index] = { ...item, editedUnit: unit };
      return next;
    });
  };

  const selectAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, action: "add" })));
  };

  const deselectAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, action: "skip" })));
  };

  // --- Confirm ---
  const handleConfirm = async () => {
    if (!receiptId) return;
    const toAdd = items.filter((i) => i.action === "add" && i.editedName.trim());
    if (toAdd.length === 0) {
      setToast("追加する食材を選択してください");
      return;
    }

    setStep("confirming");

    try {
      const res = await fetch("/api/receipt/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptId,
          items: items.map((item) => ({
            receiptItemId: item.id,
            mappedIngredientId: item.mappedIngredientId,
            finalName: item.editedName,
            finalQuantityValue: item.editedQuantity,
            finalQuantityUnit: item.editedUnit,
            finalInferredLevel: item.inferredLevel,
            finalCategory: item.editedCategory,
            action: item.action,
          })),
        }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "登録に失敗しました");
      }

      setResultMessage(`${data.added ?? 0}件追加、${data.updated ?? 0}件更新しました`);
      setStep("done");

      // Refresh ingredients
      await fetchIngredients();
      setToast(`レシートから${data.applied ?? 0}件の食材を登録しました`);
    } catch (e: any) {
      console.error("Receipt confirm error:", e);
      setError(e?.message ?? "登録中にエラーが発生しました");
      setStep("error");
    }
  };

  if (!visible) return null;

  const activeCount = items.filter((i) => i.action === "add").length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 z-20"
        style={{
          background: "var(--surface-bg)",
          borderBottom: "1px solid var(--surface-border)",
        }}
      >
        <div className="flex items-center gap-2 font-bold text-lg">
          <Receipt size={24} />
          <span>レシート読み取り</span>
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded-full transition"
          style={{ background: "var(--surface-bg)", border: "1px solid var(--surface-border)" }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Upload Step */}
        {step === "upload" && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: "var(--accent)", opacity: 0.15 }}
            >
              <Receipt size={48} style={{ color: "var(--accent)" }} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">レシートをスキャン</h2>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                レシートの写真を撮影またはアップロードすると、
                <br />
                食材を自動で読み取り、在庫に追加できます。
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white transition active:scale-95"
                style={{ background: "var(--accent)" }}
              >
                <Camera size={22} />
                カメラで撮影
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-medium transition active:scale-95"
                style={{
                  background: "var(--surface-bg)",
                  border: "1px solid var(--surface-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                <Upload size={22} />
                画像をアップロード
              </button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={onFileChange}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              className="hidden"
            />
          </div>
        )}

        {/* Scanning Step */}
        {step === "scanning" && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div className="animate-spin h-12 w-12 border-4 rounded-full" style={{ borderColor: "var(--surface-border)", borderTopColor: "var(--accent)" }} />
            <p className="text-lg font-medium">{scanMessage}</p>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              AI がレシートを解析しています...
            </p>
          </div>
        )}

        {/* Results Step */}
        {step === "results" && (
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

            {/* Item list */}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-xl p-3 transition"
                  style={{
                    background: item.action === "add" ? "var(--surface-bg)" : "transparent",
                    border: `1px solid ${item.action === "add" ? "var(--surface-border)" : "var(--surface-border)"}`,
                    opacity: item.action === "skip" ? 0.5 : 1,
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
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
                      {/* Name input */}
                      <input
                        value={item.editedName}
                        onChange={(e) => updateItemName(idx, e.target.value)}
                        className="w-full text-sm font-medium bg-transparent border-none outline-none"
                        style={{ color: "var(--color-text-primary)" }}
                        placeholder="食材名"
                      />

                      {/* Original text */}
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
                        {item.lineText}
                      </p>

                      {/* Quantity & unit */}
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="number"
                          value={item.editedQuantity ?? ""}
                          onChange={(e) => updateItemQuantity(idx, parseFloat(e.target.value) || 0)}
                          className="w-16 text-xs px-2 py-1 rounded-lg bg-transparent outline-none"
                          style={{
                            border: "1px solid var(--surface-border)",
                            color: "var(--color-text-primary)",
                          }}
                          placeholder="数量"
                        />
                        <select
                          value={item.editedUnit ?? "個"}
                          onChange={(e) => updateItemUnit(idx, e.target.value)}
                          className="text-xs px-2 py-1 rounded-lg bg-transparent outline-none"
                          style={{
                            border: "1px solid var(--surface-border)",
                            color: "var(--color-text-primary)",
                          }}
                        >
                          <option value="個">個</option>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="L">L</option>
                          <option value="本">本</option>
                          <option value="枚">枚</option>
                          <option value="袋">袋</option>
                          <option value="パック">パック</option>
                        </select>

                        {/* Confidence indicator */}
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
        )}

        {/* Confirming Step */}
        {step === "confirming" && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div className="animate-spin h-12 w-12 border-4 rounded-full" style={{ borderColor: "var(--surface-border)", borderTopColor: "var(--accent)" }} />
            <p className="text-lg font-medium">在庫に登録中...</p>
          </div>
        )}

        {/* Done Step */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "#10b981" }}
            >
              <Check size={40} className="text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">登録完了</h2>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {resultMessage}
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={resetState}
                className="w-full py-3 rounded-2xl font-bold text-white transition active:scale-95"
                style={{ background: "var(--accent)" }}
              >
                別のレシートをスキャン
              </button>
              <button
                onClick={handleClose}
                className="w-full py-3 rounded-2xl font-medium transition active:scale-95"
                style={{
                  background: "var(--surface-bg)",
                  border: "1px solid var(--surface-border)",
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        {/* Error Step */}
        {step === "error" && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "#ef4444", opacity: 0.15 }}
            >
              <AlertTriangle size={40} style={{ color: "#ef4444" }} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">エラー</h2>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {error ?? "不明なエラーが発生しました"}
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={resetState}
                className="w-full py-3 rounded-2xl font-bold text-white transition active:scale-95"
                style={{ background: "var(--accent)" }}
              >
                もう一度試す
              </button>
              <button
                onClick={handleClose}
                className="w-full py-3 rounded-2xl font-medium transition active:scale-95"
                style={{
                  background: "var(--surface-bg)",
                  border: "1px solid var(--surface-border)",
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar (results only) */}
      {step === "results" && (
        <div
          className="p-4 pb-8 z-20"
          style={{
            background: "var(--surface-bg)",
            borderTop: "1px solid var(--surface-border)",
          }}
        >
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-3 rounded-2xl font-medium transition active:scale-95"
              style={{
                background: "transparent",
                border: "1px solid var(--surface-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              className="flex-[2] py-3 rounded-2xl font-bold text-white transition active:scale-95"
              style={{
                background: activeCount > 0 ? "var(--accent)" : "var(--color-text-muted)",
              }}
              disabled={activeCount === 0}
            >
              {activeCount}件を在庫に追加
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
