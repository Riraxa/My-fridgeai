//app/menu/weekly/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NavBar from "@/app/components/NavBar";
import { useTheme } from "@/app/components/ThemeProvider";

interface Dish {
  name: string;
}

interface MenuPattern {
  title: string;
  reason: string;
  dishes: Dish[];
}

interface DailyMenuPlan {
  date: string;
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
  const router = useRouter();
  const { data: session } = useSession();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPro, setIsPro] = useState<boolean | null>(null);

  // Check if user is Pro
  useEffect(() => {
    async function checkPlan() {
      try {
        const res = await fetch("/api/user/me");
        if (res.ok) {
          const data = await res.json();
          setIsPro(data.user?.plan === "PRO");
        } else {
          setIsPro(false);
        }
      } catch {
        setIsPro(false);
      }
    }
    checkPlan();
  }, []);

  const handleGenerate = async () => {
    if (!isPro) {
      alert("1週間プランはProプラン限定機能です。");
      return;
    }

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

  // Show loading while checking plan
  if (isPro === null) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-32">
        <div className="text-gray-500">読み込み中...</div>
        <NavBar />
      </div>
    );
  }

  // Not Pro - show upgrade message
  if (!isPro) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl pb-32">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          1週間献立プラン
        </h1>

        <div className={`${theme === 'dark' ? 'bg-surface-bg border-surface-border' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-8 text-center`}>
          <div className="text-6xl mb-4">🔒</div>
          <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-color-text-primary' : ''}`}>Proプラン限定機能です</h2>
          <p className={`${theme === 'dark' ? 'text-color-text-secondary' : 'text-gray-600'} mb-6`}>
            1週間分の献立をAIで一括生成する機能は、
            <br />
            Proプランにアップグレードするとご利用いただけます。
          </p>
          <button
            onClick={() => router.push("/settings/account")}
            className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
          >
            Proプランにアップグレード
          </button>
        </div>
        <NavBar />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pb-32">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        1週間献立プラン
      </h1>

      {error && (
        <div className={`${theme === 'dark' ? 'bg-red-900/20 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-600'} p-4 rounded-lg mb-6`}>
          {error}
        </div>
      )}

      {!weeklyPlan && !loading && (
        <div className={`${theme === 'dark' ? 'bg-surface-bg border-surface-border' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-8 text-center`}>
          <div className="text-6xl mb-4">🍽️</div>
          <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-color-text-primary' : ''}`}>
            1週間分の献立をAIにおまかせ
          </h2>
          <p className={`${theme === 'dark' ? 'text-color-text-secondary' : 'text-gray-600'} mb-6`}>
            冷蔵庫の食材と賞味期限を考慮して、
            <br />
            向こう7日間の最適な献立と買い物リストを提案します。
          </p>
          <button
            onClick={handleGenerate}
            className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
          >
            プランを作成する
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-20">
          <div className="text-4xl mb-4 animate-pulse">⚡</div>
          <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-color-text-primary' : 'text-gray-700'}`}>
            7日分の献立を一気に生成中...
          </h2>
          <p className={`${theme === 'dark' ? 'text-color-text-secondary' : 'text-gray-500'}`}>
            在庫と賞味期限を計算して、最適なプランを作成します。
            <br />
            （数分ほどお待ちください）
          </p>
        </div>
      )}

      {weeklyPlan && (
        <div className="space-y-8">
          <div className="grid md:grid-cols-2 gap-4">
            {weeklyPlan.weeklyMenus.map((day, i) => (
              <div
                key={i}
                className={`${theme === 'dark' ? 'bg-surface-bg border-surface-border' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4 relative overflow-hidden`}
              >
                <div className="flex justify-between items-start mb-3 border-b pb-2">
                  <div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-color-text-muted' : 'text-gray-500'}`}>
                      {new Date(day.date).toLocaleDateString("ja-JP")}
                    </div>
                    <div className={`font-bold text-lg ${theme === 'dark' ? 'text-color-text-primary' : 'text-indigo-900'}`}>
                      {day.dayOfWeek}
                    </div>
                  </div>
                  {day.expiringItems.length > 0 && (
                    <span className={`${theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-amber-100 text-amber-800'} text-xs px-2 py-1 rounded-full`}>
                      ⚠️ 期限近: {day.expiringItems[0]}など
                    </span>
                  )}
                </div>
                <h3 className={`font-bold mb-2 ${theme === 'dark' ? 'text-color-text-primary' : 'text-gray-800'}`}>
                  {day.menu.main.title}
                </h3>
                <p className={`text-sm mb-3 line-clamp-2 ${theme === 'dark' ? 'text-color-text-secondary' : 'text-gray-600'}`}>
                  {day.menu.main.reason}
                </p>
                <ul className="text-sm space-y-1">
                  {day.menu.main.dishes.map((dish, idx) => (
                    <li key={idx} className={`flex items-center ${theme === 'dark' ? 'text-color-text-secondary' : 'text-gray-700'}`}>
                      <span className="mr-2">🍽️</span> {dish.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className={`${theme === 'dark' ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-100'} rounded-xl p-6 border`}>
            <h2 className={`text-xl font-bold mb-4 flex items-center ${theme === 'dark' ? 'text-green-200' : 'text-green-800'}`}>
              <span>🛒</span> まとめて買い物リスト
            </h2>
            <div className={`${theme === 'dark' ? 'bg-surface-bg' : 'bg-white'} rounded-lg p-4 shadow-sm`}>
              {weeklyPlan.shoppingList.length === 0 ? (
                <p className={`${theme === 'dark' ? 'text-color-text-secondary' : 'text-gray-500'}`}>買い足す食材はありません！👏</p>
              ) : (
                <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {weeklyPlan.shoppingList.map((item, i) => (
                    <li
                      key={i}
                      className={`flex items-center ${theme === 'dark' ? 'text-color-text-secondary border-surface-border' : 'text-gray-700 border-gray-100'} border-b py-1`}
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
      <NavBar />
    </div>
  );
}
