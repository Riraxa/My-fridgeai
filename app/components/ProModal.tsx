//app/components/ProModal.tsx
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
          data.error ??
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
          <div
            className="p-4 rounded-lg"
            style={{
              background: "var(--surface-bg)",
              borderLeft: "4px solid var(--accent)",
              borderRadius: "0.75rem",
            }}
          >
            <p className="font-bold mb-2">Proにすると、できることが広がります</p>
            <ul
              className="list-none space-y-2 text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <li className="flex items-center gap-2">
                <span>✨</span>
                <span>AI献立生成が<span className="font-bold" style={{ color: "var(--accent)" }}>1日3回</span>まで使える</span>
              </li>
              <li className="flex items-center gap-2">
                <span>📅</span>
                <span>1週間分の献立を一括作成</span>
              </li>
              <li className="flex items-center gap-2">
                <span>📊</span>
                <span>献立ごとの「節約度」スコア表示</span>
              </li>
              <li className="flex items-center gap-2">
                <span>🥗</span>
                <span>栄養バランスの詳細評価・アドバイス</span>
              </li>
              <li className="flex items-center gap-2">
                <span>🥚</span>
                <span>基本食材の管理・カスタマイズ</span>
              </li>
              <li className="flex items-center gap-2">
                <span>💰</span>
                <span>1食あたりの予算を指定可能</span>
              </li>
              <li className="flex items-center gap-2">
                <span>🥕</span>
                <span>期限切れ食材を優先消費</span>
              </li>
            </ul>
          </div>

          <p>
            My-fridgeaiは、
            <br />
            「冷蔵庫の中身をムダにしたくない」
            <br />
            という思いから、高校生が一人で作っているアプリです。
          </p>

          <p>
            いただく支援は、様々な機能改善やサーバーの安定化、使いやすさの改善に使わせていただきます。あなたの一押しが「もっと賢い提案」として返ってきます！
          </p>

          <p>
            もし「これ、助かったな」「これからも続いてほしいな」と感じたら、Proで応援してもらえるととっても嬉しいです！！
          </p>

          <p
            className="text-right text-sm italic"
            style={{ color: "var(--color-text-muted)" }}
          >
            — My-fridgeai 開発者（起業家高校生）
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
