"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";

/**
 * ProModal (globals.css に合わせたスタイル適用版)
 *
 * 注意点:
 * - globals.css の .card / .modal-card / .continue-btn / .cancel-btn 等のユーティリティクラスを使って
 *   ライト／ダークどちらのテーマ変数にも自動で追随するようにしています。
 * - 強調色は CSS の --accent を使うため、色のハードコーディングは避けています。
 */

interface ProModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ProModal({ open, onClose }: ProModalProps) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/createCheckoutSession", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No URL returned from checkout session creation:", data);
        alert(
          data.error ||
            "エラーが発生しました。しばらくしてから再度お試しください。",
        );
      }
    } catch (error) {
      console.error("Failed to start checkout session:", error);
      alert(
        "通信エラーが発生しました。ネットワーク環境を確認して再度お試しください。",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="modal-card max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle
            className="title text-center"
            style={{ fontSize: "1.125rem", fontWeight: 700 }}
          >
            Proで応援する
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 px-2 leading-relaxed">
          <p>プランの制限（AI献立 1日1回など）に達しました 🍳</p>

          <div
            className="p-4 rounded-lg"
            style={{
              background: "var(--surface-bg)",
              borderLeft: "4px solid var(--accent)",
              borderRadius: "0.75rem",
            }}
          >
            <p className="font-bold mb-2">Proにアップグレードすると</p>
            <ul
              className="list-disc list-inside space-y-1 text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <li>
                AI献立生成が{" "}
                <span className="font-bold text-accent">無制限</span>
              </li>
              <li>
                食材登録数が{" "}
                <span className="font-bold text-accent">無制限</span>{" "}
                (通常100件)
              </li>
              <li>
                家族グループ作成 & 共有{" "}
                <span className="font-bold text-accent">可能</span>
              </li>
              <li>
                バーコードスキャン{" "}
                <span className="font-bold text-accent">無制限</span>
              </li>
              <li>期限優先、栄養バランス考慮など</li>
            </ul>
          </div>

          <p>
            このアプリは「冷蔵庫の中身をムダにしない」を
            本気で考えて、高校生が一人で開発しています。
          </p>
          <p>
            もし役に立っていたら、 Proで応援してもらえると開発の励みになります！
          </p>

          <p
            className="text-right text-sm italic"
            style={{ color: "var(--color-text-muted)" }}
          >
            — My-FridgeAI 開発者
          </p>
        </div>

        {/* フッタ：ボタン文字を左右中央寄せ */}
        <DialogFooter className="mt-6">
          <div className="flex flex-col gap-2 w-full">
            <Button
              onClick={handleSubscribe}
              className="continue-btn w-full flex items-center justify-center text-center"
              disabled={loading}
              aria-disabled={loading}
            >
              {loading ? "読み込み中..." : "Proで応援する"}
            </Button>

            <Button
              onClick={onClose}
              className="cancel-btn w-full flex items-center justify-center text-center"
            >
              キャンセル
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
