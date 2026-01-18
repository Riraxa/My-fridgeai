"use client";

import { useState, useEffect } from "react";
import InventoryAlert from "@/app/components/inventory-alert";
import MenuCard from "@/app/components/menu-card";
import ErrorBoundary from "@/app/components/error-boundary";
import { useRouter } from "next/navigation";

// Helper to calculate total cooking time from dishes
const calculateCookingTime = (dishes: any[]) => {
  if (!dishes) return "20分";
  // Check if dishes have cookingTime (AI might return it, if not default or sum)
  // Assuming AI returns cookingTime (number) in dishes
  const sum = dishes.reduce(
    (acc: number, d: any) => acc + (d.cookingTime || 0),
    0,
  );
  return sum > 0 ? `${sum}分` : "20分"; // Default fallback
};

// Helper to calculate max difficulty
const calculateDifficulty = (dishes: any[]) => {
  if (!dishes) return "★3";
  const nums = dishes.map((d: any) => d.difficulty || 3);
  const max = Math.max(...nums);
  return `★${max}`;
};

export default function MenuGeneratePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<any>(null); // To store API response
  const [error, setError] = useState<string | null>(null);

  // Inventory Summary State
  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [expiringCount, setExpiringCount] = useState<number | null>(null);

  // Fetch Inventory Summary on Load
  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch("/api/ingredients");
        if (res.ok) {
          const data = await res.json();
          // Fix: API returns { items: [] }
          const ingredients = data.items || [];

          setInventoryCount(ingredients.length);

          const now = new Date();
          const count = ingredients.filter((i: any) => {
            if (!i.expirationDate) return false;
            const exp = new Date(i.expirationDate);
            const diffTime = exp.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 3 && diffDays >= 0;
          }).length;
          setExpiringCount(count);
        }
      } catch (e) {
        console.error("Failed summary", e);
      }
    }
    fetchSummary();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/menu/generate", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        // Handle specific error for free plan limit etc
        throw new Error(data.error || "Failed to generate");
      }

      setGenerated(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMenu = async (type: string) => {
    if (!generated?.menuGenerationId) return;

    if (
      !confirm("この献立で調理を記録しますか？\n（冷蔵庫の在庫が消費されます）")
    ) {
      return;
    }

    try {
      const res = await fetch("/api/menu/cook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuGenerationId: generated.menuGenerationId,
          selectedMenu: type,
          // cookedDishes: optional, defaults to all
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record cooking");
      }

      alert("調理を記録しました！ホームに戻ります。");
      router.push("/home"); // Or dashboard
    } catch (e: any) {
      alert(`エラーが発生しました: ${e.message}`);
    }
  };

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI献立提案</h1>
          <a
            href="/menu/weekly"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center bg-indigo-50 px-3 py-1.5 rounded-full"
          >
            <span className="mr-1">🗓️</span> 1週間分を作成する (Pro)
          </a>
        </div>

        {/* Alert Banner */}
        <InventoryAlert />

        {/* Quick Settings Link */}
        <div className="flex justify-end mb-4">
          <a
            href="/settings/expiration"
            className="text-xs text-gray-500 hover:text-indigo-600 flex items-center"
          >
            <span>⚡</span> 賞味期限の優先度設定 (Pro)
          </a>
        </div>

        {/* Initial State / Header */}
        {!generated && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center mb-8">
            <div className="mb-6">
              <div className="text-4xl mb-2">👩‍🍳</div>
              <h2 className="text-xl font-medium text-gray-800">
                冷蔵庫の食材から献立を考えます
              </h2>
              <p className="text-gray-500 mt-2">
                現在、在庫が{" "}
                <span className="font-bold text-gray-900">
                  {inventoryCount ?? "-"}
                </span>{" "}
                品あります。
                <br />
                そのうち{" "}
                <span className="font-bold text-amber-600">
                  {expiringCount ?? "-"}
                </span>{" "}
                品の賞味期限が迫っています。
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                loading
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  AIが考え中...
                </>
              ) : (
                "献立を提案してもらう"
              )}
            </button>

            {error && (
              <div className="mt-4 text-red-600 bg-red-50 p-3 rounded">
                ⚠️ {error}
              </div>
            )}
          </div>
        )}

        {/* Generated Results */}
        {generated && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">🎯 おすすめの献立</h2>
              <button
                onClick={() => setGenerated(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← 戻る
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Menu */}
              <MenuCard
                type="main"
                menu={{
                  name: generated.menus.main.title,
                  description: generated.menus.main.reason,
                  cookingTime: calculateCookingTime(
                    generated.menus.main.dishes,
                  ),
                  difficulty: calculateDifficulty(generated.menus.main.dishes),
                  calories: "N/A",
                  dishes: generated.menus.main.dishes,
                }}
                availability={generated.availability.main}
                nutrition={generated.nutrition?.main}
                onSelect={() => handleSelectMenu("main")}
                isBest={true}
              />

              {/* Alternative A */}
              <MenuCard
                type="altA"
                menu={{
                  name: generated.menus.alternativeA.title,
                  description: generated.menus.alternativeA.reason,
                  cookingTime: calculateCookingTime(
                    generated.menus.alternativeA.dishes,
                  ),
                  difficulty: calculateDifficulty(
                    generated.menus.alternativeA.dishes,
                  ),
                  calories: "N/A",
                  dishes: generated.menus.alternativeA.dishes,
                }}
                availability={generated.availability.altA}
                nutrition={generated.nutrition?.altA}
                onSelect={() => handleSelectMenu("altA")}
              />

              {/* Alternative B */}
              <MenuCard
                type="altB"
                menu={{
                  name: generated.menus.alternativeB.title,
                  description: generated.menus.alternativeB.reason,
                  cookingTime: calculateCookingTime(
                    generated.menus.alternativeB.dishes,
                  ),
                  difficulty: calculateDifficulty(
                    generated.menus.alternativeB.dishes,
                  ),
                  calories: "N/A",
                  dishes: generated.menus.alternativeB.dishes,
                }}
                availability={generated.availability.altB}
                nutrition={generated.nutrition?.altB}
                onSelect={() => handleSelectMenu("altB")}
              />
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
