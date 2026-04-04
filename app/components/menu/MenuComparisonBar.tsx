// app/components/menu/MenuComparisonBar.tsx
"use client";

import { Package, Coins, Heart, Zap, Sparkles, TrendingUp } from "lucide-react";

interface PlanScores {
  inventoryUsage: number;
  costEfficiency: number;
  healthScore: number;
  timeEfficiency?: number;
}

interface PlanComparison {
  mainPlan: PlanScores;
  alternativePlan: PlanScores;
  summary?: {
    mainPlanStrength: string;
    alternativePlanStrength: string;
  };
}

interface MenuComparisonBarProps {
  comparison: PlanComparison;
  mainRole: "balanced" | "timeOptimized" | "costOptimized" | "healthOptimized" | "creative";
  alternativeRole: "balanced" | "timeOptimized" | "costOptimized" | "healthOptimized" | "creative";
  isPro: boolean;
}

const roleLabels: Record<string, string> = {
  balanced: "バランス案",
  timeOptimized: "時短案",
  costOptimized: "節約案",
  healthOptimized: "健康案",
  creative: "創作案",
};

const scoreConfig = [
  { key: "inventoryUsage", label: "在庫消費", icon: Package, color: "emerald", gradient: "from-emerald-400 to-emerald-600" },
  { key: "healthScore", label: "健康度", icon: Heart, color: "rose", gradient: "from-rose-400 to-rose-600" },
  { key: "timeEfficiency", label: "時短度", icon: Zap, color: "amber", gradient: "from-amber-400 to-amber-600" },
];

const costConfig = { key: "costEfficiency", label: "節約度", icon: Coins, color: "blue", gradient: "from-blue-400 to-blue-600" };

export default function MenuComparisonBar({
  comparison,
  mainRole,
  alternativeRole,
  isPro,
}: MenuComparisonBarProps) {
  const { mainPlan, alternativePlan, summary } = comparison;

  // どちらが優れているかを判定
  const getWinner = (main: number, alt: number): "main" | "alternative" | "tie" => {
    if (main > alt + 5) return "main";
    if (alt > main + 5) return "alternative";
    return "tie";
  };

  // 総合スコアを計算
  const getTotalScore = (scores: PlanScores): number => {
    const values = [scores.inventoryUsage, scores.costEfficiency, scores.healthScore, scores.timeEfficiency || 0];
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  const mainTotal = getTotalScore(mainPlan);
  const altTotal = getTotalScore(alternativePlan);
  const overallWinner = getWinner(mainTotal, altTotal);

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--surface-border)] rounded-xl p-6 shadow-sm">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
          <TrendingUp size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            献立比較
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            2つの献立案をスコアで比較
          </p>
        </div>
      </div>

      {/* 総合スコア */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div
          className={`p-4 rounded-xl border-2 transition-all ${
            overallWinner === "main"
              ? "border-emerald-400 bg-emerald-50/50"
              : overallWinner === "alternative"
              ? "border-gray-200 bg-gray-50/50"
              : "border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {roleLabels[mainRole]}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-[var(--color-text-primary)]">
              {mainTotal}
            </span>
            <span className="text-sm text-[var(--color-text-secondary)]">/100</span>
          </div>
          {overallWinner === "main" && (
            <span className="inline-block mt-1 text-xs font-medium text-emerald-600">
              総合最適
            </span>
          )}
        </div>

        <div
          className={`p-4 rounded-xl border-2 transition-all ${
            overallWinner === "alternative"
              ? "border-violet-400 bg-violet-50/50"
              : overallWinner === "main"
              ? "border-gray-200 bg-gray-50/50"
              : "border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-violet-600" />
            <span className="text-sm font-medium text-violet-700">
              {roleLabels[alternativeRole]}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-[var(--color-text-primary)]">
              {altTotal}
            </span>
            <span className="text-sm text-[var(--color-text-secondary)]">/100</span>
          </div>
          {overallWinner === "alternative" && (
            <span className="inline-block mt-1 text-xs font-medium text-violet-600">
              総合最適
            </span>
          )}
        </div>
      </div>

      {/* 詳細スコア比較 - 横並びバー */}
      <div className="space-y-3 mb-6">
        {/* ヘッダー行 */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-20" /> {/* ラベル用スペース */}
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-700">バランス案</span>
            </div>
            <div className="flex-1 flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-violet-500" />
              <span className="text-xs font-medium text-violet-700">特化案</span>
            </div>
          </div>
        </div>

        {scoreConfig.map(({ key, label, icon: Icon, color }) => {
          const mainValue = mainPlan[key as keyof PlanScores] as number;
          const altValue = alternativePlan[key as keyof PlanScores] as number;
          // 値が0でも表示する（null/undefinedの場合のみスキップ）
          if (mainValue == null && altValue == null) return null;

          const winner = getWinner(mainValue ?? 0, altValue ?? 0);

          return (
            <div key={key} className="flex items-center gap-2">
              {/* ラベル */}
              <div className="w-20 flex items-center gap-1.5 shrink-0">
                <Icon size={14} className={`text-${color}-500`} />
                <span className="text-xs font-medium text-[var(--color-text-primary)]">
                  {label}
                </span>
              </div>

              {/* 横並びバー */}
              <div className="flex-1 flex items-center gap-3">
                {/* バランス案バー */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-7 bg-[var(--surface-lighter)] rounded-full overflow-hidden">
                    <div
                      className={`h-full flex items-center justify-end px-2 rounded-full transition-all duration-700 ${
                        winner === "main"
                          ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                          : "bg-emerald-300"
                      }`}
                      style={{
                        width: `${mainValue || 0}%`,
                      }}
                    >
                      <span className="text-xs font-bold text-white drop-shadow-sm">
                        {mainValue || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 特化案バー */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-7 bg-[var(--surface-lighter)] rounded-full overflow-hidden">
                    <div
                      className={`h-full flex items-center justify-end px-2 rounded-full transition-all duration-700 ${
                        winner === "alternative"
                          ? "bg-gradient-to-r from-violet-400 to-violet-500"
                          : "bg-violet-300"
                      }`}
                      style={{
                        width: `${altValue || 0}%`,
                      }}
                    >
                      <span className="text-xs font-bold text-white drop-shadow-sm">
                        {altValue || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {isPro && (
          (() => {
            const { key, label, icon: Icon, color } = costConfig;
            const mainValue = mainPlan[key as keyof PlanScores] as number;
            const altValue = alternativePlan[key as keyof PlanScores] as number;
            // 値が0でも表示する（null/undefinedの場合のみスキップ）
            if (mainValue == null && altValue == null) return null;
            const winner = getWinner(mainValue ?? 0, altValue ?? 0);
            return (
              <div key={key} className="flex items-center gap-2">
                <div className="w-20 flex items-center gap-1.5 shrink-0">
                  <Icon size={14} className={`text-${color}-500`} />
                  <span className="text-xs font-medium text-[var(--color-text-primary)]">
                    {label}
                  </span>
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-7 bg-[var(--surface-lighter)] rounded-full overflow-hidden">
                      <div
                        className={`h-full flex items-center justify-end px-2 rounded-full transition-all duration-700 ${
                          winner === "main"
                            ? "bg-gradient-to-r from-blue-400 to-blue-500"
                            : "bg-blue-300"
                        }`}
                        style={{ width: `${mainValue || 0}%` }}
                      >
                        <span className="text-xs font-bold text-white drop-shadow-sm">{mainValue || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-7 bg-[var(--surface-lighter)] rounded-full overflow-hidden">
                      <div
                        className={`h-full flex items-center justify-end px-2 rounded-full transition-all duration-700 ${
                          winner === "alternative"
                            ? "bg-gradient-to-r from-violet-400 to-violet-500"
                            : "bg-violet-300"
                        }`}
                        style={{ width: `${altValue || 0}%` }}
                      >
                        <span className="text-xs font-bold text-white drop-shadow-sm">{altValue || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* それぞれの強み */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[var(--surface-bg)] rounded-xl border border-[var(--surface-border)]">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-emerald-100/80 dark:bg-emerald-900/30 rounded-lg shrink-0">
              <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                バランス案の強み
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {summary.mainPlanStrength}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-violet-100/80 dark:bg-violet-900/30 rounded-lg shrink-0">
              <Zap size={14} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-violet-700 dark:text-violet-400 mb-1">
                特化案の強み
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {summary.alternativePlanStrength}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
