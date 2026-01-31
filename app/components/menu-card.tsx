//app/components/menu-card.tsx
"use client";

import {
  Clock,
  Flame,
  AlertTriangle,
  XCircle,
  BarChart2,
  Lightbulb,
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
  type: "main" | "altA" | "altB";
  menu: MenuPattern;
  availability: AvailabilityData;
  nutrition?: any;
  onSelect: () => void;
  isBest?: boolean;
  isPro?: boolean;
}

export default function MenuCard({
  type,
  menu,
  availability,
  nutrition,
  onSelect,
  isBest,
  isPro,
}: MenuCardProps) {
  const missingCount =
    availability.missing.length + availability.insufficient.length;
  const totalCount = availability.available.length + missingCount;

  return (
    <div
      className={`border rounded-lg p-6 shadow-sm ${isBest ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/10" : "border-gray-200 bg-white"}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          {isBest && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mb-2">
              おすすめ
            </span>
          )}
          <h3 className="text-lg font-bold text-gray-900">{menu.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{menu.description}</p>
        </div>
        <div className="text-right text-xs text-gray-500 space-y-1">
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
              className={`flex-shrink-0 w-10 px-1.5 py-0.5 rounded text-xs text-center mr-2 ${
                dish.type === "主菜"
                  ? "bg-orange-100 text-orange-800"
                  : dish.type === "汁物"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-green-100 text-green-800"
              }`}
            >
              {dish.type}
            </span>
            <span className="font-medium text-gray-700">{dish.name}</span>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded p-3 mb-4 text-xs space-y-2">
        <div className="flex justify-between font-medium">
          <span className="text-gray-700">在庫状況</span>
          <span
            className={missingCount === 0 ? "text-green-600" : "text-amber-600"}
          >
            {availability.available.length}/{totalCount}品 OK
          </span>
        </div>

        {availability.insufficient.length > 0 && (
          <div className="text-amber-600 flex items-start gap-1">
            <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
            <span>
              <span className="font-bold">不足:</span>{" "}
              {availability.insufficient.map((i) => i.name).join(", ")}
            </span>
          </div>
        )}
        {availability.missing.length > 0 && (
          <div className="text-red-500 flex items-start gap-1">
            <XCircle size={12} className="flex-shrink-0 mt-0.5" />
            <span>
              <span className="font-bold">なし:</span>{" "}
              {availability.missing.map((i) => i.name).join(", ")}
            </span>
          </div>
        )}
      </div>

      {nutrition && isPro && (
        <div className="bg-blue-50 border border-blue-100 rounded p-3 mb-4 text-xs">
          <div className="font-bold text-blue-800 mb-2 flex items-center gap-1">
            <BarChart2 size={14} />
            <span>栄養バランス</span>
          </div>
          <div className="grid grid-cols-2 gap-y-1 gap-x-4 mb-2 text-blue-900">
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
            <div className="text-blue-700 font-medium border-t border-blue-100 pt-1 mt-1 flex items-center gap-1">
              <Lightbulb size={12} />
              <span>{nutrition.evaluation}</span>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onSelect}
        className={`w-full py-2 px-4 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isBest
            ? "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-md"
            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500"
        }`}
      >
        この献立にする
      </button>
    </div>
  );
}
