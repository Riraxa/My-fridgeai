// app/components/FamilyInviteCard.tsx
"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import QRCode from "react-qr-code";
import { Copy, RefreshCw, Share2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface FamilyInviteCardProps {
  inviteUrl: string;
  expiresAt: string;
  onRegenerate: () => Promise<void>;
  loading?: boolean;
}

export default function FamilyInviteCard({
  inviteUrl,
  expiresAt,
  onRegenerate,
  loading = false,
}: FamilyInviteCardProps) {
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
      // Optional: Add toast here
    } catch {
      alert("コピーに失敗しました");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "家族招待リンク",
          text: "My-FridgeAIの家族グループに招待します。",
          url: inviteUrl,
        });
      } catch {
        // ignore
      }
    } else {
      handleCopy();
      alert("リンクをコピーしました");
    }
  };

  const handleRegenerate = async () => {
    if (confirm("招待リンクを再生成しますか？\n古いリンクは無効になります。")) {
      await onRegenerate();
    }
  };

  return (
    <div className="card border-l-4 border-l-green-500">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        <span>👨‍👩‍👧‍👦</span> 家族招待
      </h3>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* QR Code */}
        <div className="bg-white p-2 rounded-lg border shadow-sm flex-shrink-0 mx-auto sm:mx-0">
          <QRCode value={inviteUrl} size={100} />
        </div>

        {/* Info & Actions */}
        <div className="flex-1 w-full min-w-0 space-y-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">招待リンク</div>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-md border dark:border-gray-700">
              <code className="text-xs truncate flex-1 font-mono text-gray-700 dark:text-gray-300">
                {inviteUrl}
              </code>
              <button
                onClick={handleCopy}
                className="text-gray-500 hover:text-green-600 transition-colors"
                title="コピー"
              >
                {copying ? (
                  <span className="text-green-600 text-xs font-bold">OK</span>
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-y-2">
            <div className="text-xs text-gray-500">
              有効期限:{" "}
              <span className="font-medium">
                {format(new Date(expiresAt), "yyyy/MM/dd HH:mm", {
                  locale: ja,
                })}
              </span>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex-1 sm:flex-none gap-1.5 h-8 text-xs"
              >
                <Share2 size={13} />
                共有
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                disabled={loading}
                className="flex-1 sm:flex-none gap-1.5 h-8 text-xs text-gray-500 hover:text-orange-600"
              >
                <RefreshCw
                  size={13}
                  className={loading ? "animate-spin" : ""}
                />
                再生成
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
