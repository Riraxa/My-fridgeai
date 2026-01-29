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
          text: "My-fridgeaiの家族グループに招待します。",
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
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        家族招待
      </h3>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* QR Code */}
        <div
          className="p-2 rounded-lg border shadow-sm flex-shrink-0 mx-auto sm:mx-0"
          style={{
            background: "var(--surface-bg)",
            borderColor: "var(--surface-border)",
          }}
        >
          <QRCode value={inviteUrl} size={100} />
        </div>

        {/* Info & Actions */}
        <div className="flex-1 w-full min-w-0 space-y-3">
          <div>
            <div
              className="text-xs mb-1"
              style={{ color: "var(--color-text-secondary)" }}
            >
              招待リンク
            </div>
            <div
              className="flex items-center gap-2 p-2 rounded-md border"
              style={{
                background: "var(--surface-bg)",
                borderColor: "var(--surface-border)",
              }}
            >
              <code
                className="text-xs truncate flex-1 font-mono"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {inviteUrl}
              </code>
              <button
                onClick={handleCopy}
                className="transition-colors"
                style={{
                  color: "var(--color-text-secondary)",
                  background: "none",
                  border: "none",
                }}
                title="コピー"
              >
                {copying ? (
                  <span
                    style={{ color: "var(--accent)" }}
                    className="text-xs font-bold"
                  >
                    OK
                  </span>
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-y-2">
            <div
              className="text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
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
