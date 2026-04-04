"use client";

/**
 * 機能: 献立スコアバッジコンポーネント
 * 目的: 総合スコアを視覚的に表示
 * セキュリティ: 純粋UIコンポーネント、データ処理なし
 */

import React from "react";
import { Star, TrendingUp, Wallet, Heart } from "lucide-react";

interface ScoreBadgeProps {
  totalScore: number | null | undefined;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/**
 * スコアに応じた色を取得
 */
function getScoreColor(score: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (score >= 90) {
    return { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" };
  }
  if (score >= 75) {
    return { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" };
  }
  if (score >= 60) {
    return { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" };
  }
  if (score >= 40) {
    return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" };
  }
  return { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" };
}

/**
 * スコアに応じたラベルを取得
 */
function getScoreLabel(score: number): string {
  if (score >= 90) return "最高";
  if (score >= 75) return "優秀";
  if (score >= 60) return "良好";
  if (score >= 40) return "普通";
  return "改善余地";
}

export function ScoreBadge({
  totalScore,
  size = "md",
  showLabel = true,
  className = "",
}: ScoreBadgeProps) {
  // スコアがない場合は非表示または「未計算」表示
  if (totalScore === null || totalScore === undefined) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs ${className}`}
      >
        <Star className="w-3 h-3" />
        <span>計算中...</span>
      </div>
    );
  }

  const score = Math.max(0, Math.min(100, Math.round(totalScore)));
  const colors = getScoreColor(score);
  const label = getScoreLabel(score);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-sm gap-1.5",
    lg: "px-4 py-2 text-base gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div
      className={`
        inline-flex items-center font-medium rounded-full border
        ${colors.bg} ${colors.text} ${colors.border}
        ${sizeClasses[size]}
        ${className}
      `}
      title={`総合スコア: ${score}/100`}
    >
      <Star className={`${iconSizes[size]} fill-current`} />
      <span className="font-semibold">{score}</span>
      {showLabel && <span className="text-xs opacity-80">{label}</span>}
    </div>
  );
}

// ============================================================================
// スコア内訳コンポーネント
// ============================================================================

interface ScoreBreakdownProps {
  inventoryUsageRate: number | null | undefined; // 0.0 - 1.0
  costEfficiencyScore: number | null | undefined; // 0 - 100
  healthScore: number | null | undefined; // 0 - 100
  totalScore: number | null | undefined; // 0 - 100
  className?: string;
  compact?: boolean;
}

interface ScoreItemProps {
  icon: React.ReactNode;
  label: string;
  value: number | null | undefined;
  maxValue: number;
  unit?: string;
  colorClass: string;
}

function ScoreItem({
  icon,
  label,
  value,
  maxValue,
  unit = "",
  colorClass,
}: ScoreItemProps) {
  const percentage = value !== null && value !== undefined
    ? Math.max(0, Math.min(100, (value / maxValue) * 100))
    : 0;

  return (
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colorClass}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-semibold text-gray-900">
            {value !== null && value !== undefined
              ? `${Math.round(value)}${unit}`
              : "-"}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              percentage >= 75
                ? "bg-emerald-500"
                : percentage >= 50
                ? "bg-yellow-500"
                : "bg-orange-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function ScoreBreakdown({
  inventoryUsageRate,
  costEfficiencyScore,
  healthScore,
  totalScore,
  className = "",
  compact = false,
}: ScoreBreakdownProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {totalScore !== null && totalScore !== undefined
              ? Math.round(totalScore)
              : "-"}
          </div>
          <div className="text-xs text-gray-500">総合スコア</div>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div className="flex gap-3 text-xs">
          <div className="text-center">
            <div className="font-semibold text-gray-700">
              {inventoryUsageRate !== null && inventoryUsageRate !== undefined
                ? `${Math.round(inventoryUsageRate * 100)}%`
                : "-"}
            </div>
            <div className="text-gray-500">在庫活用</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-700">
              {costEfficiencyScore !== null && costEfficiencyScore !== undefined
                ? Math.round(costEfficiencyScore)
                : "-"}
            </div>
            <div className="text-gray-500">節約度</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-700">
              {healthScore !== null && healthScore !== undefined
                ? Math.round(healthScore)
                : "-"}
            </div>
            <div className="text-gray-500">健康度</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <ScoreItem
        icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
        label="在庫消費率"
        value={inventoryUsageRate !== null && inventoryUsageRate !== undefined
          ? inventoryUsageRate * 100
          : null}
        maxValue={100}
        unit="%"
        colorClass="bg-emerald-50"
      />
      <ScoreItem
        icon={<Wallet className="w-4 h-4 text-blue-600" />}
        label="節約度"
        value={costEfficiencyScore}
        maxValue={100}
        unit=""
        colorClass="bg-blue-50"
      />
      <ScoreItem
        icon={<Heart className="w-4 h-4 text-rose-600" />}
        label="健康度"
        value={healthScore}
        maxValue={100}
        unit=""
        colorClass="bg-rose-50"
      />
    </div>
  );
}

// ============================================================================
// Tasteサマリーコンポーネント
// ============================================================================

interface TasteSummaryProps {
  favoriteIngredients: string[];
  dislikedIngredients: string[];
  maxDisplay?: number;
  className?: string;
}

export function TasteSummary({
  favoriteIngredients,
  dislikedIngredients,
  maxDisplay = 5,
  className = "",
}: TasteSummaryProps) {
  const displayFavorites = favoriteIngredients.slice(0, maxDisplay);
  const displayDisliked = dislikedIngredients.slice(0, maxDisplay);

  return (
    <div className={`space-y-3 ${className}`}>
      {displayFavorites.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1.5">
            よく使う食材
          </div>
          <div className="flex flex-wrap gap-1.5">
            {displayFavorites.map((ingredient) => (
              <span
                key={ingredient}
                className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full"
              >
                {ingredient}
              </span>
            ))}
          </div>
        </div>
      )}

      {displayDisliked.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1.5">
            避けている食材
          </div>
          <div className="flex flex-wrap gap-1.5">
            {displayDisliked.map((ingredient) => (
              <span
                key={ingredient}
                className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full"
              >
                {ingredient}
              </span>
            ))}
          </div>
        </div>
      )}

      {displayFavorites.length === 0 && displayDisliked.length === 0 && (
        <div className="text-sm text-gray-500">
          まだ好みデータが十分にありません。献立を作るたびに学習します。
        </div>
      )}
    </div>
  );
}

export default ScoreBadge;
