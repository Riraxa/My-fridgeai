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
        console.error("No URL returned from checkout session creation");
        alert("エラーが発生しました。しばらくしてから再度お試しください。");
      }
    } catch (error) {
      console.error("Failed to start checkout session:", error);
      alert("エラーが発生しました。しばらくしてから再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            Proで応援する
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 px-2 whitespace-pre-wrap leading-relaxed">
          <p>今日の無料献立生成（2回）を使い切りました 🍳</p>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border-l-4 border-orange-400">
            <p className="font-bold mb-2">Proにすると</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                献立生成が{" "}
                <span className="font-bold text-orange-600 dark:text-orange-400">
                  無制限
                </span>
              </li>
              <li>期限が近い食材を優先</li>
              <li>栄養バランスまで考えます</li>
            </ul>
          </div>
          <p>
            このアプリは、
            <br />
            「冷蔵庫の中身をムダにしない」 を<br />
            本気で考えて作っています。
          </p>
          <p>
            もし役に立っていたら、
            <br />
            Proで応援してもらえるとめちゃくちゃ嬉しいです。
          </p>
          <p className="text-right text-sm text-gray-500 italic mt-4">
            — My-FridgeAI 開発者（高校生起業家）
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            onClick={handleSubscribe}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 text-lg shadow-lg transform transition active:scale-95"
            disabled={loading}
          >
            {loading ? "読み込み中..." : "Proで応援する"}
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-gray-500 mt-2"
          >
            キャンセル
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
