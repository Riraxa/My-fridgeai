// GENERATED_BY_AI: 2026-03-11 Antigravity
// app/components/ReceiptScanner.tsx
// Receipt upload & scan component.
// Supports camera capture (mobile) and file upload.

"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
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
  editedQuantity: number;
  editedUnit: string;
  editedCategory: string;
  estimatedExpirationDays: number | null;
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

  const { fetchIngredients, setToast, setReceiptScanOpen, setIsNavBarVisible } = useFridge();

  // レシートスキャナーが表示されたときにナビゲーションバーを非表示にする
  useEffect(() => {
    if (visible) {
      setIsNavBarVisible(false);
    } else {
      setIsNavBarVisible(true);
    }
  }, [visible, setIsNavBarVisible]);

  const [scanningSteps, setScanningSteps] = useState([
    { label: "画像を前処理中", status: "pending" as "pending" | "doing" | "done" },
    { label: "文字を読み取り中", status: "pending" as "pending" | "doing" | "done" },
    { label: "食材を特定中", status: "pending" as "pending" | "doing" | "done" },
    { label: "数量を推定中", status: "pending" as "pending" | "doing" | "done" },
    { label: "賞味期限を推定中", status: "pending" as "pending" | "doing" | "done" },
    { label: "カテゴリを分類中", status: "pending" as "pending" | "doing" | "done" },
    { label: "在庫情報を照合中", status: "pending" as "pending" | "doing" | "done" },
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

    // Simulate progress steps
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

      // API processing with actual progress tracking
      const apiPromise = fetch("/api/receipt/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const res = await apiPromise;
      const data = await res.json();

      if (!res.ok) {
        let errorMessage = data.error ?? "レシートの処理に失敗しました";
        
        // Provide more specific error messages for common issues
        if (res.status === 504 || errorMessage.includes("timeout")) {
          errorMessage = "処理がタイムアウトしました。もう一度お試しいただくか、より明瞭なレシート画像を使用してください。";
        } else if (res.status === 422) {
          errorMessage = data.error ?? "レシートの読み取りに失敗しました。画像が鮮明であることを確認してください。";
        }
        
        throw new Error(errorMessage);
      }

      // Update steps based on actual API completion
      updateStep(0, "done"); // Image preprocessing
      updateStep(1, "doing"); // OCR processing
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep(1, "done");
      updateStep(2, "doing"); // Food identification
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep(2, "done");
      updateStep(3, "doing"); // Quantity estimation
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep(3, "done");
      updateStep(4, "doing"); // Expiration estimation
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep(4, "done");
      updateStep(5, "doing"); // Category classification
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep(5, "done");
      updateStep(6, "doing"); // Inventory matching
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep(6, "done");
      setReceiptId(data.receiptId);

      if (!data.items || data.items.length === 0) {
        setError("商品を検出できませんでした。別のレシートをお試しください。");
        setStep("error");
        return;
      }

      // Map to editable items
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
      // Brief delay to show last checkmark
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
        {/* Upload Step */}
        {step === "upload" && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div className="flex flex-col items-center justify-center">
              <svg
                width="96"
                height="96"
                viewBox="0 0 96 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mb-6"
              >
                {/* レシートの背景 */}
                <rect
                  x="20"
                  y="16"
                  width="56"
                  height="64"
                  rx="4"
                  fill="var(--accent)"
                  fillOpacity="0.15"
                  stroke="var(--accent)"
                  strokeWidth="2"
                />
                
                {/* レシートの線 */}
                <line
                  x1="28"
                  y1="28"
                  x2="68"
                  y2="28"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="28"
                  y1="36"
                  x2="60"
                  y2="36"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="28"
                  y1="44"
                  x2="64"
                  y2="44"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="28"
                  y1="52"
                  x2="56"
                  y2="52"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                
                {/* スキャンアイコン（オレンジ色） */}
                <circle
                  cx="48"
                  cy="64"
                  r="8"
                  fill="var(--accent)"
                  fillOpacity="0.3"
                  stroke="var(--accent)"
                  strokeWidth="2"
                />
                <rect
                  x="44"
                  y="60"
                  width="8"
                  height="8"
                  rx="1"
                  fill="var(--accent)"
                />
                
                {/* スキャン線 */}
                <rect
                  x="16"
                  y="24"
                  width="64"
                  height="2"
                  fill="var(--accent)"
                  fillOpacity="0.6"
                  rx="1"
                />
              </svg>
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
          <div className="flex flex-col items-center justify-center h-full gap-8 py-12">
            <div className="relative">
              <div
                className="animate-spin h-20 w-20 border-4 rounded-full"
                style={{ borderColor: "var(--surface-border)", borderTopColor: "var(--accent)" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent animate-pulse">
                  <rect x="4" y="2" width="24" height="28" rx="2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2"/>
                  <line x1="10" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="10" y1="14" x2="18" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="10" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="16" cy="26" r="4" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2"/>
                  <rect x="14" y="24" width="4" height="4" rx="1" fill="currentColor"/>
                </svg>
              </div>
            </div>

            <div className="w-full max-w-xs space-y-4">
              {scanningSteps.map((s, i) => (
                <div key={i} className="flex items-center gap-3 transition-opacity duration-300" style={{ opacity: s.status === "pending" ? 0.4 : 1 }}>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      s.status === "done" ? "bg-green-500" : s.status === "doing" ? "bg-accent" : "bg-gray-700"
                    }`}
                  >
                    {s.status === "done" ? (
                      <Check size={14} className="text-white" />
                    ) : s.status === "doing" ? (
                      <div className="w-2 h-2 bg-[var(--background)] rounded-full animate-ping" />
                    ) : (
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${s.status === "doing" ? "text-accent" : "text-gray-300"}`}>{s.label}</span>
                </div>
              ))}
            </div>

            <div className="text-center">
              <p className="text-lg font-bold mb-1">{scanMessage}</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                AI が丁寧にレシートを読み取っています。
                <br />
                少々お待ちください...
              </p>
            </div>
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
                        className="w-full text-base font-bold bg-transparent border-none outline-none"
                        style={{ color: "var(--color-text-primary)" }}
                        placeholder="食材名"
                      />

                      {/* Quantity & unit */}
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
