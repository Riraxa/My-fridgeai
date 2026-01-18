// app/components/InviteSuccessModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import QRCode from "react-qr-code";
import { Copy, Share2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface InviteSuccessModalProps {
  open: boolean;
  onClose: () => void;
  inviteUrl: string;
  expiresAt: string;
}

export default function InviteSuccessModal({
  open,
  onClose,
  inviteUrl,
  expiresAt,
}: InviteSuccessModalProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert("リンクをコピーしました！");
    } catch {
      alert("コピーに失敗しました");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "家族招待リンク",
          text: "My-FridgeAIの家族グループに招待します。このリンクから参加してください。",
          url: inviteUrl,
        });
      } catch (e) {
        // user cancelled or failed
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">
            家族招待リンクを作成しました！🎉
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          <p className="text-sm text-center text-gray-500">
            家族がこのリンクから参加できます。
          </p>

          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <QRCode value={inviteUrl} size={160} />
          </div>

          <div className="w-full space-y-2">
            <div className="text-xs font-semibold text-gray-500 mb-1">
              ▼ 招待リンク
            </div>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
              <div className="text-xs truncate flex-1 text-gray-600 dark:text-gray-300">
                {inviteUrl}
              </div>
              <button
                onClick={handleCopy}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="コピー"
              >
                <Copy size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleShare}
            >
              <Share2 size={16} />
              共有
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={onClose}
            >
              閉じる
            </Button>
          </div>

          <div className="text-xs text-center space-y-1 text-gray-400">
            <p>
              有効期限：
              {format(new Date(expiresAt), "yyyy/MM/dd HH:mm", { locale: ja })}
            </p>
            <p className="text-orange-500">
              ※ このリンクは最新の1つのみ有効です
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
