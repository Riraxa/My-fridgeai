// app/components/menu/MenuResultCard.tsx
// 2案献立表示用カード（バランス最適案・特化案）

"use client";

import { Clock, BarChart2, Lightbulb, ShoppingCart, Sparkles, Zap, PiggyBank, Heart, Palette } from "lucide-react";

interface IngredientStatus {
  name: string;
  required: { amount: number; unit: string };
  inStock?: { amount: number | string; unit: string };
  shortage?: { amount: number; unit: string };
  status: "available" | "insufficient" | "missing";
}

interface AvailabilityData {
  available: IngredientStatus[];
  insufficient: IngredientStatus[];
  missing: IngredientStatus[];
}

interface PlanScores {
  inventoryUsage: number;
  costEfficiency: number;
  healthScore: number;
  timeEfficiency?: number;
}

interface MenuDish {
  name: string;
  type: string;
  description: string;
  ingredients: { name: string; amount: string }[];
}

interface MenuPattern {
  name: string;
  description: string;
  cookingTime: string;
  difficulty: string;
  dishes: MenuDish[];
  role?: "balanced" | "timeOptimized" | "costOptimized" | "healthOptimized" | "creative";
  specializationReason?: string;
}

interface MenuResultCardProps {
  type: "main" | "alternative";
  menu: MenuPattern;
  scores: PlanScores;
  availability: AvailabilityData;
  nutrition?: any;
  onSelect: () => void;
  isBest?: boolean;
  isPro?: boolean;
  onAddToShoppingList?: (ingredients: string[]) => void;
}

const roleConfig = {
  balanced: {
    label: "バランス最適",
    icon: Sparkles,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  timeOptimized: {
    label: "時短特化",
    icon: Zap,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  costOptimized: {
    label: "節約特化",
    icon: PiggyBank,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  healthOptimized: {
    label: "健康特化",
    icon: Heart,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
  },
  creative: {
    label: "創作特化",
    icon: Palette,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
};

export default function MenuResultCard({
  type,
  menu,
  scores,
  availability,
  nutrition,
  onSelect,
  isBest,
  isPro,
  onAddToShoppingList,
}: MenuResultCardProps) {
  const missingCount = availability.missing.length + availability.insufficient.length;
  const totalCount = availability.available.length + missingCount;
  const role = menu.role || "balanced";
  const config = roleConfig[role];
  const RoleIcon = config.icon;

  const formatIngredientDetail = (ingredient: IngredientStatus) => {
    const requiredAmount = `${ingredient.required.amount}${ingredient.required.unit}`;

    if (ingredient.inStock?.unit === "implicit") {
      return `${ingredient.name}: ${requiredAmount}`;
    }

    switch (ingredient.status) {
      case "available":
        const stockAmount = ingredient.inStock
          ? `${ingredient.inStock.amount}${ingredient.inStock.unit}`
          : "在庫あり";
        return `${ingredient.name}: ${stockAmount}/必要${requiredAmount} ✅`;

      case "insufficient":
        const currentAmount = ingredient.inStock
          ? `${ingredient.inStock.amount}${ingredient.inStock.unit}`
          : "0";
        const shortageAmount = ingredient.shortage
          ? `${ingredient.shortage.amount}${ingredient.shortage.unit}`
          : `${ingredient.required.amount}${ingredient.required.unit}`;
        return `${ingredient.name}: ${currentAmount}/必要${requiredAmount} ⚠️ (不足${shortageAmount})`;

      case "missing":
        return `${ingredient.name}: 0/必要${requiredAmount} ❌`;

      default:
        return `${ingredient.name}: ${requiredAmount}`;
    }
  };

  const getMissingIngredients = () => {
    return [...availability.missing, ...availability.insufficient].map((i) => i.name);
  };


  return (
    <div
      className={`border rounded-xl p-6 shadow-sm transition-all duration-300 ${
        isBest
          ? "border-[var(--accent)] ring-1 ring-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]"
          : "border-[var(--surface-border)] bg-[var(--card-bg)]"
      }`}
    >
      {/* ヘッダー：役割ラベル */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${config.bgColor} ${config.borderColor} border`}>
          <RoleIcon size={14} className={config.color} />
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        </div>
        {isBest && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]">
            <Sparkles size={12} />
            おすすめ
          </span>
        )}
      </div>

      {/* タイトルと説明 */}
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
        {menu.name}
      </h3>
      <p className="text-sm text-[var(--color-text-secondary)] mb-4 leading-relaxed">
        {menu.description}
      </p>

      {/* 特化理由（代替案のみ） */}
      {type === "alternative" && menu.specializationReason && (
        <div className="mb-4 p-3 bg-[var(--surface-lighter)] rounded-lg">
          <p className="text-xs text-[var(--color-text-secondary)]">
            <span className="font-medium">特化ポイント:</span> {menu.specializationReason}
          </p>
        </div>
      )}

      {/* 基本情報 */}
      <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)] mb-4">
        <div className="flex items-center gap-1">
          <Clock size={14} />
          <span>{menu.cookingTime}</span>
        </div>
        <div className="flex items-center gap-1">
          <BarChart2 size={14} />
          <span>難易度: {menu.difficulty}</span>
        </div>
      </div>

      {/* 在庫状況 - 全食材表示 */}
      <div className="mb-4 p-3 bg-[var(--surface-lighter)] rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            在庫状況
          </span>
          <span className={`text-xs font-medium ${missingCount === 0 ? "text-emerald-600" : "text-amber-600"}`}>
            {missingCount === 0
              ? `✅ ${totalCount}品揃っています`
              : `⚠️ ${availability.available.length}/${totalCount}品揃っています`}
          </span>
        </div>

        {/* 全食材リスト */}
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {/* 利用可能な食材 */}
          {availability.available.map((item, idx) => (
            <p key={`avail-${idx}`} className="text-xs text-emerald-600">
              {formatIngredientDetail(item)}
            </p>
          ))}
          {/* 不足している食材 */}
          {availability.insufficient.map((item, idx) => (
            <p key={`ins-${idx}`} className="text-xs text-amber-600">
              {formatIngredientDetail(item)}
            </p>
          ))}
          {/* 欠品している食材 */}
          {availability.missing.map((item, idx) => (
            <p key={`miss-${idx}`} className="text-xs text-rose-600">
              {formatIngredientDetail(item)}
            </p>
          ))}
        </div>

        {/* 不足食材を買い物リストに追加 */}
        {missingCount > 0 && onAddToShoppingList && (
          <div className="mt-3 pt-3 border-t border-[var(--surface-border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">
                不足分を買い物リストに追加
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToShoppingList(getMissingIngredients());
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <ShoppingCart size={12} />
                一括追加
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {getMissingIngredients().join(", ")}
            </p>
          </div>
        )}
      </div>

      {/* 料理一覧 */}
      <div className="space-y-2 mb-4">
        {menu.dishes.map((dish, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between py-2 border-b border-[var(--surface-border)] last:border-0"
          >
            <div>
              <span className="text-xs text-[var(--color-text-secondary)]">{dish.type}</span>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{dish.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 栄養情報（Pro機能） */}
      {isPro && nutrition && (
        <div className="mb-4 p-4 bg-[var(--surface-lighter)] rounded-lg">
          <div className="flex items-center gap-1 mb-3">
            <Lightbulb size={14} className="text-[var(--accent)]" />
            <span className="text-xs font-medium text-[var(--color-text-primary)]">
              栄養バランス
            </span>
          </div>
          {/* 栄養素グリッド - 画像のようなレイアウト */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-[var(--color-text-secondary)]">カロリー:</span>
              <span className="text-base font-semibold text-[var(--color-text-primary)]">
                {Math.round(nutrition.total?.calories || 0)}kcal
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-[var(--color-text-secondary)]">タンパク質:</span>
              <span className="text-base font-semibold text-[var(--color-text-primary)]">
                {Math.round(nutrition.total?.protein || 0)}g
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-[var(--color-text-secondary)]">脂質:</span>
              <span className="text-base font-semibold text-[var(--color-text-primary)]">
                {Math.round(nutrition.total?.fat || 0)}g
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-[var(--color-text-secondary)]">炭水化物:</span>
              <span className="text-base font-semibold text-[var(--color-text-primary)]">
                {Math.round(nutrition.total?.carbs || 0)}g
              </span>
            </div>
          </div>
          {/* 栄養評価コメント */}
          {nutrition.evaluation && (
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed border-t border-[var(--surface-border)] pt-2">
              {nutrition.evaluation}
            </p>
          )}
        </div>
      )}

      {/* アクションボタン */}
      <button
        onClick={onSelect}
        className={`w-full py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ${
          isBest
            ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
            : "bg-[var(--surface-lighter)] text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)]"
        }`}
      >
        {isBest ? "この献立を選ぶ" : "この献立を選ぶ"}
      </button>
    </div>
  );
}
