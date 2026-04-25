import { Check, Loader2, AlertCircle } from "lucide-react";
import type { SaveState } from "@/app/hooks/useAutoSave";

interface SaveIndicatorProps {
  state: SaveState;
  error: string | null;
  onRetry: () => void;
}

export function SaveIndicator({ state, error, onRetry }: SaveIndicatorProps) {
  switch (state) {
    case "dirty":
      return (
        <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          未保存の変更あり
        </span>
      );
    case "saving":
      return (
        <span className="flex items-center gap-1 text-xs text-indigo-500 font-medium">
          <Loader2 size={12} className="animate-spin" />
          保存中...
        </span>
      );
    case "error":
      return (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-xs text-red-500 font-medium hover:underline"
        >
          <AlertCircle size={12} />
          {error ?? "保存失敗"} - 再試行
        </button>
      );
    case "saved":
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
          <Check size={12} />
          保存しました
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
          <Check size={12} />
          保存済み
        </span>
      );
  }
}
