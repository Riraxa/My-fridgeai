// app/components/menu/MenuLightSuggestion.tsx
// 軽量サジェスト（第3の提案）表示コンポーネント

"use client";

import { Lightbulb, Sparkles, Zap, PiggyBank, Heart, Palette, ArrowRight, TrendingUp } from "lucide-react";

interface LightSuggestion {
  text: string;
  label: "時短" | "節約" | "創作" | "健康" | "簡単";
  confidence: number;
  hint?: string;
}

interface MenuLightSuggestionProps {
  suggestion: LightSuggestion;
  onClick?: () => void;
}

const labelConfig = {
  時短: { icon: Zap, color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  節約: { icon: PiggyBank, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  創作: { icon: Palette, color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  健康: { icon: Heart, color: "text-rose-600", bgColor: "bg-rose-50", borderColor: "border-rose-200" },
  簡単: { icon: Sparkles, color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
};

export default function MenuLightSuggestion({ suggestion, onClick }: MenuLightSuggestionProps) {
  const config = labelConfig[suggestion.label] || labelConfig["創作"];
  const Icon = config.icon;

  // 確信度に応じて色を変える
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return "text-emerald-600";
    if (confidence >= 0.6) return "text-amber-600";
    return "text-gray-500";
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return "高い確信度";
    if (confidence >= 0.6) return "良好な確信度";
    return "参考程度";
  };

  return (
    <div
      onClick={onClick}
      className={`group relative bg-[var(--card-bg)] border border-[var(--surface-border)] rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer hover:border-[var(--accent)] ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      {/* ヘッダーアイコン */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-sm">
          <Lightbulb size={18} className="text-white" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
            もう一つの提案
          </h4>
          <p className="text-xs text-[var(--color-text-secondary)]">
            異なる方向性のアイデア
          </p>
        </div>
      </div>

      {/* サジェスト内容 */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-lg ${config.bgColor} ${config.borderColor} border shrink-0`}>
          <Icon size={16} className={config.color} />
        </div>
        <div className="flex-1">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color} mb-1`}>
            {suggestion.label}
          </span>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">
            {suggestion.text}
          </p>
        </div>
      </div>

      {/* ヒント（あれば） */}
      {suggestion.hint && (
        <p className="text-sm text-[var(--color-text-secondary)] mb-3 pl-11 leading-relaxed">
          {suggestion.hint}
        </p>
      )}

      {/* 確信度インジケーター */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--surface-border)]">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className={getConfidenceColor(suggestion.confidence)} />
          <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
            {getConfidenceLabel(suggestion.confidence)}
          </span>
        </div>
        
        {onClick && (
          <div className="flex items-center gap-1 text-xs text-[var(--accent)] group-hover:text-[var(--accent-hover)] transition-colors">
            <span>詳細を見る</span>
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        )}
      </div>

      {/* 装飾的な要素 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-100/50 to-orange-100/50 rounded-bl-full -z-10 pointer-events-none" />
    </div>
  );
}
