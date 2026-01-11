"use client";

import React, { useState } from "react";
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

type ShoppingListConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  missingIngredients: string[];
};

export default function ShoppingListConfirmModal({
  open,
  onClose,
  missingIngredients,
}: ShoppingListConfirmModalProps) {
  const { setShopping } = useFridge();
  const [loading, setLoading] = useState(false);

  // 一括追加
  const handleAddAll = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/shopping-list/batch-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: missingIngredients }),
      });

      if (!res.ok) {
        throw new Error("Failed to add items");
      }

      const data = await res.json();
      const count = data.processed || 0;

      // ローカル側の買い物リストも更新（再フェッチするか、疑似的に追加するか）
      // ここでは簡易的に現在のshoppingステートにマージする動きを入れたいが、
      // ShoppingListは単純配列ではなくオブジェクトなので、本来はリロード推奨。
      // とりあえずToastを出して閉じる。自動リロード機構があればそれが一番。

      toast.success(`${count}件の食材を買い物リストに追加しました`);

      // FridgeProviderに強制リロードさせる関数があれば呼ぶべきだが、現状ないので
      // ユーザーが自分で買い物リストを開いたときに更新されることを期待するか、
      // 簡易的にlocation.reload()等はUX悪い。
      // 今回は「追加しました」の表示のみで終了とする（次回開いた時に同期されるはず）

      onClose();
    } catch (err) {
      console.error(err);
      toast.error("買い物リストへの追加に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md modal-card">
        <DialogHeader>
          <DialogTitle>不足している食材があります</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            献立に必要な材料のうち、冷蔵庫に見当たらないものが{" "}
            {missingIngredients.length} 件あります。
            <br />
            買い物リストに追加しますか？
          </p>

          <div className="bg-[var(--surface-bg)] rounded-md p-3 max-h-48 overflow-y-auto border border-[var(--surface-border)]">
            <ul className="space-y-1">
              {missingIngredients.map((item, idx) => (
                <li key={idx} className="flex items-center text-sm">
                  <span className="text-accent mr-2">●</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            追加しない
          </Button>
          <Button onClick={handleAddAll} disabled={loading}>
            {loading ? "追加中..." : "買い物リストに追加"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
