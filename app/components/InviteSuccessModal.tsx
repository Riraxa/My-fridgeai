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
          text: "My-fridgeaiの家族グループに招待します。このリンクから参加してください。",
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
      <DialogContent className="modal-card max-w-sm">
        <DialogHeader>
          <DialogTitle
            className="text-center text-lg font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            家族招待リンクを作成しました！🎉
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          <p
            className="text-sm text-center"
            style={{ color: "var(--color-text-secondary)" }}
          >
            家族がこのリンクから参加できます。
          </p>

          <div
            className="p-4 rounded-xl border shadow-sm"
            style={{
              background: "var(--surface-bg)",
              borderColor: "var(--surface-border)",
            }}
          >
            <QRCode value={inviteUrl} size={160} />
          </div>

          <div className="w-full space-y-2">
            <div
              className="text-xs font-semibold mb-1"
              style={{ color: "var(--color-text-secondary)" }}
            >
              ▼ 招待リンク
            </div>
            <div
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{
                background: "var(--surface-bg)",
                borderColor: "var(--surface-border)",
                border: "1px solid",
              }}
            >
              <div
                className="text-xs truncate flex-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {inviteUrl}
              </div>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md transition-colors hover-btn"
                style={{ background: "transparent", border: "none" }}
                title="コピー"
              >
                <Copy
                  size={16}
                  style={{ color: "var(--color-text-secondary)" }}
                />
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

          <div
            className="text-xs text-center space-y-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            <p>
              有効期限：
              {format(new Date(expiresAt), "yyyy/MM/dd HH:mm", { locale: ja })}
            </p>
            <p className="text-orange-500" style={{ color: "var(--accent)" }}>
              ※ このリンクは最新の1つのみ有効です
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
