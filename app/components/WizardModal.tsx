// app/components/WizardModal.tsx
"use client";

import React, { useEffect, useState, KeyboardEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { useFridge } from "./FridgeProvider";

// Ingredient Type Definition (aligned with Prisma schema)
type Ingredient = {
  name: string;
  expirationDate?: Date | string | null;
  [key: string]: any;
};

type WizardModalProps = {
  open: boolean;
  onClose: () => void;
  onComplete: (menus: any[]) => void;
  fridgeItems: Ingredient[]; // Changed from string[] to Ingredient[]
  selectedTypes?: string[];
  servings?: number | string;
  appetite?: string;
};

import ProModal from "@/app/components/ProModal";
import ShoppingListConfirmModal from "@/app/components/ShoppingListConfirmModal";

export default function WizardModal({
  open,
  onClose,
  onComplete,
  fridgeItems,
  selectedTypes,
  servings,
  appetite,
}: WizardModalProps) {
  const { setShopping } = useFridge();

  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [lastGenerateAt, setLastGenerateAt] = useState<number>(0);

  // "dashboard" = Initial Overview, "selection" = Manual Select
  const [view, setView] = useState<"dashboard" | "selection">("dashboard");
  const [mode, setMode] = useState<"selected" | "omakase">("omakase");

  const [showProModal, setShowProModal] = useState(false);
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [missingIngredients, setMissingIngredients] = useState<string[]>([]);

  // Derived State: Expiring Items
  const expiringItems = React.useMemo(() => {
    const now = new Date();
    return fridgeItems
      .filter((item) => {
        if (!item.expirationDate) return false;
        const exp = new Date(item.expirationDate);
        const diffTime = exp.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 3;
      })
      .sort((a, b) => {
        const dateA = new Date(a.expirationDate!).getTime();
        const dateB = new Date(b.expirationDate!).getTime();
        return dateA - dateB;
      });
  }, [fridgeItems]);

  // Derived State: Days remaining helper
  const getDaysRemaining = (dateStr?: string | Date | null) => {
    if (!dateStr) return null;
    const now = new Date();
    const exp = new Date(dateStr);
    const diffTime = exp.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Initialization
  useEffect(() => {
    if (open) {
      const init: Record<string, boolean> = {};
      fridgeItems.forEach((f) => (init[f.name] = true));
      setSelectedMap(init);
      setLoading(false);

      // Smart Default: If expiring items exist, default to omakase
      const hasExpiring = expiringItems.length > 0;
      setMode(hasExpiring ? "omakase" : "selected");
      setView("dashboard"); // Always start at dashboard

      // Reset modal states
      setShowShoppingModal(false);
      setMissingIngredients([]);
    }
  }, [open, fridgeItems, expiringItems]);

  const selectedNames = Object.keys(selectedMap).filter((k) => selectedMap[k]);
  const selectedCount = selectedNames.length;

  const toggleItem = (name: string) => {
    setSelectedMap((s) => ({ ...s, [name]: !s[name] }));
  };

  const selectAll = () => {
    const m: Record<string, boolean> = {};
    fridgeItems.forEach((f) => (m[f.name] = true));
    setSelectedMap(m);
  };

  const clearAll = () => {
    const m: Record<string, boolean> = {};
    fridgeItems.forEach((f) => (m[f.name] = false));
    setSelectedMap(m);
  };

  const handleKeyToggle =
    (name: string) => (e: KeyboardEvent<HTMLElement> | React.KeyboardEvent) => {
      if ("key" in e && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        toggleItem(name);
      }
    };

  // Generate Menu Logic
  const generateMenus = async (overrideMode?: "selected" | "omakase") => {
    const targetMode = overrideMode ?? mode;

    // Check constraints
    if (targetMode === "selected" && selectedCount === 0) {
      toast.error("最低1つの食材を選択してください");
      return;
    }

    const now = Date.now();
    if (now - lastGenerateAt < 1500) return;
    setLastGenerateAt(now);

    setLoading(true);

    try {
      const payload = {
        mealTypes:
          Array.isArray(selectedTypes) && selectedTypes.length
            ? selectedTypes
            : ["主菜"],
        servings: Number(servings ?? 1),
        appetite: appetite ?? "普通",
        usedFridgeItems:
          targetMode === "selected"
            ? selectedNames
            : fridgeItems.map((i) => i.name),
        mode: targetMode,
      };

      const res = await fetch("/api/menu/wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403 && data?.error?.code === "LIMIT_REACHED") {
          setLoading(false);
          setShowProModal(true);
          return;
        }

        const msg =
          data?.error ??
          (res.status === 429
            ? "AIの利用制限に達しています。時間を空けるか、生成回数を減らしてください。"
            : `献立生成に失敗しました（${res.status}）。`);
        toast.error(msg);
        setLoading(false);
        return;
      }

      const menus = Array.isArray(data.menus) ? data.menus : [];
      onComplete(menus);
      onClose();
      toast.success(
        menus.length ? "献立を取得しました" : "献立が見つかりませんでした",
      );

      if (
        data.missingIngredients &&
        Array.isArray(data.missingIngredients) &&
        data.missingIngredients.length > 0
      ) {
        setMissingIngredients(data.missingIngredients);
        setShowShoppingModal(true);
      }
    } catch (err: any) {
      console.error("WizardModal.generateMenus error", err);
      toast.error("献立生成中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // UI Styles
  const itemBaseStyle = {
    background: "var(--surface-bg)",
    color: "var(--color-text-primary)",
    borderColor: "var(--surface-border)",
  } as React.CSSProperties;

  const itemSelectedStyle = {
    background: "var(--accent)",
    color: "white",
    borderColor:
      "color-mix(in srgb, var(--accent) 40%, transparent)" as unknown as string,
  } as React.CSSProperties;

  // Render Content based on View State
  const renderContent = () => {
    // 1. Loading Screen
    if (loading) {
      return (
        <div className="py-20 text-center space-y-6">
          <div className="flex justify-center">
            <div
              className="animate-spin text-6xl"
              style={{ color: "var(--accent)" }}
            >
              🔄
            </div>
          </div>
          <div>
            <h3
              className="text-xl font-bold mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              AIが献立を考え中...
            </h3>
            {expiringItems.length > 0 && (
              <p className="font-medium" style={{ color: "#f59e0b" }}>
                賞味期限が近い食材を優先しています...
              </p>
            )}
          </div>
        </div>
      );
    }

    // 2. Dashboard Screen (Initial)
    if (view === "dashboard") {
      if (fridgeItems.length === 0) {
        return (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <p
              className="mb-4"
              style={{ color: "var(--color-text-secondary)" }}
            >
              冷蔵庫に食材がありません
            </p>
            <a
              href="/ingredients"
              className="font-medium hover:underline"
              style={{ color: "var(--accent)" }}
            >
              食材を追加する →
            </a>
          </div>
        );
      }

      return (
        <div className="space-y-6 py-2">
          {/* Header Area */}
          <div className="text-center">
            <h2
              className="text-xl font-bold flex items-center justify-center gap-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              <span>🎯</span> AI献立提案
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--color-text-secondary)" }}
            >
              冷蔵庫の{" "}
              <span
                className="font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                {fridgeItems.length}
              </span>{" "}
              品から最適な献立を提案します
            </p>
          </div>

          {/* Expiration Warnings */}
          {expiringItems.length > 0 ? (
            <div
              className="p-4 rounded-r-lg"
              style={{ background: "#fef3c7", borderLeft: "4px solid #f59e0b" }}
            >
              <h3
                className="font-bold mb-2 flex items-center"
                style={{ color: "#92400e" }}
              >
                ⚠️ 賞味期限が近い食材 ({expiringItems.length}品)
              </h3>
              <ul className="space-y-1">
                {expiringItems.slice(0, 3).map((item, idx) => {
                  const days = getDaysRemaining(item.expirationDate);
                  const isUrgent = days !== null && days <= 1;
                  return (
                    <li key={idx} className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {["牛乳", "卵", "肉", "魚"].some((k) =>
                          item.name.includes(k),
                        )
                          ? "🥩"
                          : "🥬"}
                        {item.name}
                      </span>
                      <span
                        style={{
                          color: isUrgent ? "#dc2626" : "#d97706",
                          fontWeight: "bold",
                        }}
                      >
                        あと{days}日
                      </span>
                    </li>
                  );
                })}
                {expiringItems.length > 3 && (
                  <li className="text-xs pt-1" style={{ color: "#d97706" }}>
                    他 {expiringItems.length - 3} 品の食材も期限が近いです
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <div
              className="p-4 rounded-lg text-center"
              style={{ background: "#dbeafe", color: "#1d4ed8" }}
            >
              <p>✅ 賞味期限切れが近い食材はありません</p>
              <p className="text-xs mt-1" style={{ color: "#3730a3" }}>
                好きな食材を選んで献立を作れます
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={() => generateMenus("omakase")}
              className="w-full py-6 text-lg font-bold shadow-md"
              style={{
                background: "var(--accent)",
                color: "#fff",
              }}
            >
              おまかせで献立作成
            </Button>

            <Button
              variant="outline"
              onClick={() => setView("selection")}
              className="w-full py-4"
              style={{
                background: "var(--surface-bg)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--surface-border)",
              }}
            >
              食材を選んで作成
            </Button>
          </div>

          {/* Footer Link */}
          <div className="flex justify-end">
            <a
              href="/settings/expiration"
              target="_blank"
              className="text-xs hover:underline flex items-center gap-1 group"
              style={{ color: "var(--accent)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#4f46e5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--accent)";
              }}
            >
              <span className="group-hover:scale-110 transition-transform">
                ⚡
              </span>
              <span>優先度設定 (Pro)</span>
            </a>
          </div>
        </div>
      );
    }

    // 3. Selection Screen (Manual)
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-medium">使いたい食材を選択</div>
          <div
            className="text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            選択:{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>
              {selectedCount}
            </strong>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            全選択
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll}>
            全解除
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("dashboard")}
            className="ml-auto"
            style={{ color: "var(--color-text-secondary)" }}
          >
            ← 戻る
          </Button>
        </div>

        <div
          className="grid grid-cols-2 gap-2 max-h-72 overflow-auto p-1"
          role="list"
        >
          {fridgeItems.map((item) => {
            const sel = !!selectedMap[item.name];
            return (
              <div
                key={item.name}
                role="option"
                aria-selected={sel}
                onClick={() => toggleItem(item.name)}
                className="rounded-lg border p-3 cursor-pointer transition-colors"
                style={sel ? itemSelectedStyle : itemBaseStyle}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={sel}
                    readOnly
                    className="w-4 h-4"
                  />
                  <span className={sel ? "text-white" : ""}>{item.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          onClick={() => generateMenus("selected")}
          className="w-full mt-4"
          style={{ background: "var(--accent)", color: "#fff", border: "none" }}
        >
          選択した食材で作成 ({selectedCount}品)
        </Button>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md modal-card">
          <DialogHeader>
            {/* Title is handled inside dashboard view for custom layout, hiding default title visually if needed or keeping generic */}
            <DialogTitle className="sr-only">献立ウィザード</DialogTitle>
          </DialogHeader>

          {renderContent()}

          {!loading && view === "selection" && (
            <DialogFooter className="sm:justify-center hidden">
              {/* Footer content moved inside selection view for better layout control */}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <ProModal open={showProModal} onClose={() => setShowProModal(false)} />
      <ShoppingListConfirmModal
        open={showShoppingModal}
        onClose={() => setShowShoppingModal(false)}
        missingIngredients={missingIngredients}
      />
    </>
  );
}
