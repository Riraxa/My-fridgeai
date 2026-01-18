"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface Dish {
  name: string;
  // other props
}

interface MenuPattern {
  title: string;
  reason: string;
  dishes: Dish[];
}

interface DailyMenuPlan {
  date: string; // ISO string from API
  dayOfWeek: string;
  menu: {
    main: MenuPattern;
  };
  expiringItems: string[];
}

interface WeeklyPlanResponse {
  weeklyMenus: DailyMenuPlan[];
  shoppingList: string[];
}

export default function WeeklyPlanningPage() {
  const [loading, setLoading] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (
      !confirm(
        "1週間分の献立を生成しますか？\n（在庫状況から最適なプランを作成します）",
      )
    )
      return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/menu/generate-weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: new Date() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成に失敗しました");

      setWeeklyPlan(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span>🗓️</span> 1週間献立プラン (Beta)
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {!weeklyPlan && !loading && (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h2 className="text-xl font-bold mb-2">
            1週間分の献立をAIにおまかせ
          </h2>
          <p className="text-gray-600 mb-6">
            冷蔵庫の食材と賞味期限を考慮して、
            <br />
            向こう7日間の最適な献立と買い物リストを提案します。
          </p>
          <button
            onClick={handleGenerate}
            className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
          >
            プランを作成する (Pro)
          </button>
          <p className="text-xs text-gray-400 mt-4">
            ※Proプラン限定機能です。生成には時間がかかります。
          </p>
        </div>
      )}

      <div className="text-center py-20">
        <div className="animate-spin text-4xl mb-4">⚡</div>
        <h2 className="text-xl font-bold text-gray-700">
          7日分の献立を一気に生成中...
        </h2>
        <p className="text-gray-500">
          在庫と賞味期限を計算して、最適なプランを作成します。
          <br />
          （約10〜15秒お待ちください）
        </p>
      </div>

      {weeklyPlan && (
        <div className="space-y-8">
          {/* Weekly Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {weeklyPlan.weeklyMenus.map((day, i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border p-4 relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-3 border-b pb-2">
                  <div>
                    <div className="text-xs text-gray-500">
                      {new Date(day.date).toLocaleDateString("ja-JP")}
                    </div>
                    <div className="font-bold text-lg text-indigo-900">
                      {day.dayOfWeek}
                    </div>
                  </div>
                  {day.expiringItems.length > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                      ⚠️ 期限近: {day.expiringItems[0]}など
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-800 mb-2">
                  {day.menu.main.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {day.menu.main.reason}
                </p>
                <ul className="text-sm space-y-1">
                  {day.menu.main.dishes.map((dish, idx) => (
                    <li key={idx} className="flex items-center text-gray-700">
                      <span className="mr-2">🍽️</span> {dish.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Consolidated Shopping List */}
          <div className="bg-green-50 rounded-xl p-6 border border-green-100">
            <h2 className="text-xl font-bold text-green-800 mb-4 flex items-center">
              <span>🛒</span> まとめて買い物リスト
            </h2>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              {weeklyPlan.shoppingList.length === 0 ? (
                <p className="text-gray-500">買い足す食材はありません！👏</p>
              ) : (
                <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {weeklyPlan.shoppingList.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center text-gray-700 border-b border-gray-100 py-1"
                    >
                      <span className="text-green-500 mr-2">☐</span> {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
