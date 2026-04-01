// GENERATED_BY_AI: 2026-03-11 Antigravity
// app/components/ReceiptScanner.tsx
// Receipt upload & scan component.
// Supports camera capture (mobile) and file upload.

"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useFridge } from "./FridgeProvider";
import { X, Check, AlertTriangle } from "lucide-react";
import { ParsedItem, ScanStep, ScanProgressStep } from "./receipt/types";
import UploadView from "./receipt/UploadView";
import ScanningView from "./receipt/ScanningView";
import ResultsView from "./receipt/ResultsView";

export default function ReceiptScanner({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose?: () => void;
}) {
  const [step, setStep] = useState<ScanStep>("upload");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState("レシートを解析中...");
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const { fetchIngredients, setToast, setIsNavBarVisible } = useFridge();

  useEffect(() => {
    if (visible) {
      setIsNavBarVisible(false);
    } else {
      setIsNavBarVisible(true);
    }
  }, [visible, setIsNavBarVisible]);

  const [scanningSteps, setScanningSteps] = useState<ScanProgressStep[]>([
    { label: "画像を前処理中", status: "pending" },
    { label: "文字を読み取り中", status: "pending" },
    { label: "食材を特定中", status: "pending" },
    { label: "数量を推定中", status: "pending" },
    { label: "賞味期限を推定中", status: "pending" },
    { label: "カテゴリを分類中", status: "pending" },
    { label: "在庫情報を照合中", status: "pending" },
  ]);

  const resetState = useCallback(() => {
    setStep("upload");
    setItems([]);
    setReceiptId(null);
    setError(null);
    setResultMessage(null);
    setScanningSteps([
      { label: "画像を前処理中", status: "pending" },
      { label: "文字を読み取り中", status: "pending" },
      { label: "食材を特定中", status: "pending" },
      { label: "数量を推定中", status: "pending" },
      { label: "賞味期限を推定中", status: "pending" },
      { label: "カテゴリを分類中", status: "pending" },
      { label: "在庫情報を照合中", status: "pending" },
    ]);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    setIsNavBarVisible(true);
    onClose?.();
  }, [resetState, onClose, setIsNavBarVisible]);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;

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

    const updateStep = (idx: number, status: "pending" | "doing" | "done") => {
      setScanningSteps((prev) => {
        const next = [...prev];
        if (next[idx]) next[idx] = { ...next[idx], status };
        return next;
      });
    };

    updateStep(0, "doing");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("idempotencyKey", `${Date.now()}-${Math.random().toString(36).slice(2)}`);

      const apiPromise = fetch("/api/receipt/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const res = await apiPromise;
      const data = await res.json();

      if (!res.ok) {
        let errorMessage = data.error ?? "レシートの処理に失敗しました";
        if (res.status === 504 || errorMessage.includes("timeout")) {
          errorMessage = "処理がタイムアウトしました。もう一度お試しいただくか、より明瞭なレシート画像を使用してください。";
        } else if (res.status === 422) {
          errorMessage = data.error ?? "レシートの読み取りに失敗しました。画像が鮮明であることを確認してください。";
        }
        throw new Error(errorMessage);
      }

      updateStep(0, "done");
      updateStep(1, "doing");
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep(1, "done");
      updateStep(2, "doing");
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep(2, "done");
      updateStep(3, "doing");
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep(3, "done");
      updateStep(4, "doing");
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep(4, "done");
      updateStep(5, "doing");
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep(5, "done");
      updateStep(6, "doing");
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep(6, "done");
      setReceiptId(data.receiptId);

      if (!data.items || data.items.length === 0) {
        setError("商品を検出できませんでした。別のレシートをお試しください。");
        setStep("error");
        return;
      }

      const editableItems: ParsedItem[] = data.items.map((item: any) => ({
        ...item,
        action: item.confidenceScore < 0.6 ? ("skip" as const) : ("add" as const),
        editedName: item.normalizedName ?? item.productName ?? "読み取り不明",
        editedQuantity: item.quantityValue ?? 1,
        editedUnit: item.quantityUnit ?? "個",
        editedCategory: item.processedCategory && ["冷蔵", "冷凍", "野菜", "調味料", "加工食品", "その他"].includes(item.processedCategory) 
          ? item.processedCategory 
          : "その他",
        estimatedExpirationDays: item.estimatedExpirationDays ?? null,
      }));

      setItems(editableItems);
      setTimeout(() => setStep("results"), 800);
    } catch (e: any) {
      console.error("Receipt upload error:", e);
      setError(e?.message ?? "レシートの処理中にエラーが発生しました");
      setStep("error");
    }
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }, [handleFile]);

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

  const selectAll = () => setItems((prev) => prev.map((item) => ({ ...item, action: "add" })));
  const deselectAll = () => setItems((prev) => prev.map((item) => ({ ...item, action: "skip" })));

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
            finalInferredLevel: null,
            finalCategory: item.editedCategory,
            finalExpirationDays: item.estimatedExpirationDays,
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="2" width="16" height="20" rx="2" fill="var(--accent)" fillOpacity="0.15" stroke="var(--accent)" strokeWidth="2"/>
            <line x1="8" y1="6" x2="16" y2="6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="10" x2="14" y2="10" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="14" x2="16" y2="14" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="18" r="3" fill="var(--accent)" fillOpacity="0.3" stroke="var(--accent)" strokeWidth="2"/>
            <rect x="11" y="17" width="2" height="2" rx="0.5" fill="var(--accent)"/>
          </svg>
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
      <div className="flex-1 overflow-y-auto p-4 relative">
        {step === "upload" && <UploadView onFileChange={onFileChange} />}

        {step === "scanning" && (
          <ScanningView scanMessage={scanMessage} scanningSteps={scanningSteps} />
        )}

        {step === "results" && (
          <ResultsView
            items={items}
            selectAll={selectAll}
            deselectAll={deselectAll}
            toggleItemAction={toggleItemAction}
            updateItemName={updateItemName}
            updateItemQuantity={updateItemQuantity}
            updateItemUnit={updateItemUnit}
          />
        )}

        {step === "confirming" && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div className="animate-spin h-12 w-12 border-4 rounded-full" style={{ borderColor: "var(--surface-border)", borderTopColor: "var(--accent)" }} />
            <p className="text-lg font-medium">在庫に登録中...</p>
          </div>
        )}

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
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{resultMessage}</p>
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
