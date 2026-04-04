//app/components/menu-card.tsx
"use client";

import {
  Clock,
  Flame,
  BarChart2,
  Lightbulb,
  ShoppingCart,
} from "lucide-react";

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
  calories: string;
  dishes: MenuDish[];
}

interface MenuCardProps {
  _type: "main" | "altA" | "altB";
  menu: MenuPattern;
  availability: AvailabilityData;
  nutrition?: any;
  onSelect: () => void;
  isBest?: boolean;
  isPro?: boolean;
  onAddToShoppingList?: (ingredients: string[]) => void;
}

export default function MenuCard({
  _type,
  menu,
  availability,
  nutrition,
  onSelect,
  isBest,
  isPro,
  onAddToShoppingList,
}: MenuCardProps) {
  const missingCount =
    availability.missing.length + availability.insufficient.length;
  const totalCount = availability.available.length + missingCount;

  // 材料の詳細表示を整形するヘルパー関数
  const formatIngredientDetail = (ingredient: IngredientStatus) => {
    const requiredAmount = `${ingredient.required.amount}${ingredient.required.unit}`;

    // 暗黙食材（常に利用可能な調味料など）はシンプルに表示
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

  // 買い物リストに追加する材料リストを取得
  const getMissingIngredients = () => {
    return [...availability.missing, ...availability.insufficient].map(
      (i) => i.name,
    );
  };

  return (
    <div
      className={`border rounded-lg p-6 shadow-sm transition-all duration-300 ${isBest
          ? "border-[var(--accent)] ring-1 ring-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
          : "border-[var(--surface-border)] bg-[var(--card-bg)]"
        }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          {isBest && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent)] mb-2">
              おすすめ
            </span>
          )}
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
            {menu.name}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {menu.description}
          </p>
        </div>
        <div className="text-right text-xs text-[var(--color-text-secondary)] space-y-1">
          <div className="flex items-center justify-end gap-1">
            <Clock size={12} />
            <span>{menu.cookingTime}</span>
          </div>
          <div className="flex items-center justify-end gap-1">
            <Flame size={12} />
            <span>{menu.calories}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {menu.dishes.map((dish, idx) => (
          <div key={idx} className="flex items-start text-sm">
            <span
              className={`flex-shrink-0 w-10 px-1.5 py-0.5 rounded text-xs text-center mr-2 ${dish.type === "主菜"
                  ? "bg-[color-mix(in_srgb,#ff914d_20%,transparent)] text-[#ff914d]"
                  : dish.type === "汁物"
                    ? "bg-[color-mix(in_srgb,#3b82f6_20%,transparent)] text-[#3b82f6]"
                    : "bg-[color-mix(in_srgb,#10b981_20%,transparent)] text-[#10b981]"
                }`}
            >
              {dish.type}
            </span>
            <span className="font-medium text-[var(--color-text-primary)]">
              {dish.name}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface-bg)] rounded p-3 mb-4 text-xs space-y-3 border border-[var(--surface-border)]">
        <div className="flex justify-between font-medium">
          <span className="text-[var(--color-text-primary)]">在庫状況</span>
          <span
            className={
              missingCount === 0
                ? "text-[var(--semantic-green)]"
                : "text-amber-600 dark:text-amber-400"
            }
          >
            {availability.available.length}/{totalCount}品揃っています
          </span>
        </div>

        {/* 詳細材料リスト */}
        <div className="space-y-2">
          {/* 在庫ありの材料 */}
          {availability.available.length > 0 && (
            <div className="space-y-1">
              {availability.available.map((ingredient, idx) => (
                <div
                  key={idx}
                  className="text-[var(--semantic-green)] text-xs"
                >
                  {formatIngredientDetail(ingredient)}
                </div>
              ))}
            </div>
          )}

          {/* 不足の材料 */}
          {availability.insufficient.length > 0 && (
            <div className="space-y-1">
              {availability.insufficient.map((ingredient, idx) => (
                <div
                  key={idx}
                  className="text-amber-600 dark:text-amber-400 text-xs flex items-start gap-1"
                >
                  <span className="flex-shrink-0 mt-0.5">⚠️</span>
                  <span>{formatIngredientDetail(ingredient)}</span>
                </div>
              ))}
            </div>
          )}

          {/* なしの材料 */}
          {availability.missing.length > 0 && (
            <div className="space-y-1">
              {availability.missing.map((ingredient, idx) => (
                <div
                  key={idx}
                  className="text-red-500 dark:text-red-400 text-xs flex items-start gap-1"
                >
                  <span className="flex-shrink-0 mt-0.5">❌</span>
                  <span>{formatIngredientDetail(ingredient)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 買い物リスト連携 */}
        {missingCount > 0 && onAddToShoppingList && (
          <div className="border-t border-[var(--surface-border)] pt-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)] text-xs">
                不足分を買い物リストに追加
              </span>
              <button
                onClick={() => onAddToShoppingList(getMissingIngredients())}
                className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors"
              >
                <ShoppingCart size={12} />
                一括追加
              </button>
            </div>
            <div className="mt-1 text-xs text-[var(--color-text-muted)]">
              {getMissingIngredients().join(", ")}
            </div>
          </div>
        )}
      </div>

      {nutrition && isPro && (
        <div className="bg-[color-mix(in_srgb,#3b82f6_10%,transparent)] border border-[color-mix(in_srgb,#3b82f6_20%,transparent)] rounded p-3 mb-4 text-xs">
          <div className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-1">
            <BarChart2 size={14} />
            <span>栄養バランス</span>
          </div>
          <div className="grid grid-cols-2 gap-y-1 gap-x-4 mb-2 text-blue-900 dark:text-blue-200">
            <div className="flex justify-between">
              <span>カロリー:</span>{" "}
              <span className="font-medium">
                {Math.round(nutrition.total.calories)}kcal
              </span>
            </div>
            <div className="flex justify-between">
              <span>タンパク質:</span>{" "}
              <span className="font-medium">
                {Math.round(nutrition.total.protein)}g
              </span>
            </div>
            <div className="flex justify-between">
              <span>脂質:</span>{" "}
              <span className="font-medium">
                {Math.round(nutrition.total.fat)}g
              </span>
            </div>
            <div className="flex justify-between">
              <span>炭水化物:</span>{" "}
              <span className="font-medium">
                {Math.round(nutrition.total.carbs)}g
              </span>
            </div>
          </div>
          {nutrition.evaluation && (
            <div className="text-blue-700 dark:text-blue-300 font-medium border-t border-[color-mix(in_srgb,#3b82f6_20%,transparent)] pt-1 mt-1 flex items-center gap-1">
              <Lightbulb size={12} />
              <span>{nutrition.evaluation}</span>
            </div>
          )}
          <div className="mt-2 text-[10px] text-blue-600/70 dark:text-blue-400/70 text-right">
            ※栄養値はAIによる推定値です
          </div>
        </div>
      )}

      <button
        onClick={onSelect}
        className={`w-full py-2 px-4 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ${isBest
            ? "bg-[var(--accent)] text-white hover:bg-[color-mix(in_srgb,var(--accent)_90%,#000)] focus:ring-[var(--accent)] shadow-md"
            : "bg-[var(--surface-bg)] text-[var(--color-text-primary)] border border-[var(--surface-border)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] focus:ring-[var(--accent)]"
          }`}
      >
        この献立にする
      </button>
    </div>
  );
}
