//app/menu/generate/page.tsx
"use client";

import { useState, useEffect } from "react";
import MenuCard from "@/app/components/menu-card";
import ErrorBoundary from "@/app/components/error-boundary";
import NavBar from "@/app/components/NavBar";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  X,
  Clock,
  ChefHat,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  History,
  Calendar,
} from "lucide-react";
import PageTransition, {
  HeaderTransition,
  ContentTransition,
} from "@/app/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { useFridge } from "@/app/components/FridgeProvider";
import { toast } from "sonner";

// Helper to calculate total cooking time from dishes
const calculateCookingTime = (dishes: any[]) => {
  if (!dishes) return "20分";
  const sum = dishes.reduce(
    (acc: number, d: any) => acc + (d.cookingTime || 0),
    0,
  );
  return sum > 0 ? `${sum}分` : "20分";
};

// Helper to calculate max difficulty
const calculateDifficulty = (dishes: any[]) => {
  if (!dishes) return "★3";
  const nums = dishes.map((d: any) => d.difficulty || 3);
  const max = Math.max(...nums);
  return `★${max}`;
};

interface RecipeDetail {
  title: string;
  description?: string;
  servings: number;
  time_minutes: number;
  difficulty: string;
  ingredients: {
    name: string;
    quantity_per_serving: number;
    unit: string;
    total_quantity: number;
    optional: boolean;
    notes?: string;
  }[];
  steps: string[];
  tips: string[];
  pitfalls?: string[];
  storage?: string;
}

export default function MenuGeneratePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { setShopping, setToast } = useFridge();

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [usage, setUsage] = useState<{
    today: number;
    limit: number;
    remaining: number;
  } | null>(null);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(
    null,
  );

  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [expiringCount, setExpiringCount] = useState<number | null>(null);

  // Recipe Detail Modal State
  const [selectedMenuType, setSelectedMenuType] = useState<string | null>(null);
  const [selectedMenuData, setSelectedMenuData] = useState<any>(null);
  const [recipeDetails, setRecipeDetails] = useState<RecipeDetail[]>([]);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [currentDishIndex, setCurrentDishIndex] = useState(0);

  // 買い物リストに材料を追加する関数
  const handleAddToShoppingList = async (ingredients: string[]) => {
    try {
      // 各材料を買い物リストに追加
      const newShoppingItems = ingredients.map((ingredient, index) => ({
        id: `shopping-${Date.now()}-${index}`,
        name: ingredient,
        done: false,
        quantity: "",
        unit: "",
        note: "",
      }));

      // 既存の買い物リストに追加
      setShopping((prev) => {
        const existing = prev || [];
        // 重複を避けるために既存のアイテムをチェック
        const filtered = ingredients.filter(
          (ingredient) =>
            !existing.some((item: any) => item.name === ingredient),
        );

        const newItems = filtered.map((ingredient, index) => ({
          id: `shopping-${Date.now()}-${index}`,
          name: ingredient,
          done: false,
          quantity: "",
          unit: "",
          note: "",
        }));

        return [...existing, ...newItems];
      });

      toast.success(
        `${ingredients.length}件の食材を買い物リストに追加しました`,
      );
    } catch (error) {
      console.error("買い物リストへの追加に失敗しました:", error);
      toast.error("買い物リストへの追加に失敗しました");
    }
  };

  // 状態の保存・復元
  useEffect(() => {
    // ページ読み込み時に状態を復元
    const savedState = localStorage.getItem("menuGenerationState");
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // 30分以内の状態のみ復元
        if (
          Date.now() - state.timestamp < 30 * 60 * 1000 &&
          state.loading &&
          state.currentGenerationId
        ) {
          setLoading(true);
          setCurrentGenerationId(state.currentGenerationId);
          // 少し遅延してポーリングを再開
          setTimeout(() => {
            pollForCompletion(state.currentGenerationId);
          }, 1000);
        } else {
          localStorage.removeItem("menuGenerationState");
        }
      } catch (e) {
        console.error("Failed to restore state:", e);
        localStorage.removeItem("menuGenerationState");
      }
    }
  }, []);

  // 状態が変更されたら保存
  useEffect(() => {
    if (loading || currentGenerationId) {
      localStorage.setItem(
        "menuGenerationState",
        JSON.stringify({
          loading,
          currentGenerationId,
          timestamp: Date.now(),
        }),
      );
    } else {
      localStorage.removeItem("menuGenerationState");
    }
  }, [loading, currentGenerationId]);

  // ページ可視性の監視
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && loading && currentGenerationId) {
        // タブが再びアクティブになったらポーリングを再開
        pollForCompletion(currentGenerationId);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loading, currentGenerationId]);

  // ESCキーでモーダルが閉じるのを防止
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESCキーでモーダルが閉じるのを防止
      if (e.key === "Escape") {
        const currentSelectedMenuType = selectedMenuType;
        if (currentSelectedMenuType) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedMenuType]);

  // Fetch user plan and inventory summary
  useEffect(() => {
    async function fetchData() {
      try {
        const userRes = await fetch("/api/user/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          setIsPro(userData.user?.plan === "PRO");
          setUsage(userData.usage);
        }

        const res = await fetch("/api/ingredients");
        if (res.ok) {
          const data = await res.json();
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
        console.error("Failed to fetch data", e);
      }
    }
    fetchData();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      // Start async generation
      const res = await fetch("/api/menu/generate-async", { method: "POST" });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "生成の開始に失敗しました");
      }

      const data = await res.json();
      const generationId = data.menuGenerationId;
      setCurrentGenerationId(generationId);

      // すぐに状態を保存して、即座タブ移動に対応
      localStorage.setItem(
        "menuGenerationState",
        JSON.stringify({
          loading: true,
          currentGenerationId: generationId,
          timestamp: Date.now(),
        }),
      );

      // 少し遅延してポーリングを開始（即座タブ移動対策）
      setTimeout(() => {
        pollForCompletion(generationId);
      }, 1000); // 1秒後に開始
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      setCurrentGenerationId(null);
      localStorage.removeItem("menuGenerationState");
    }
  };

  const pollForCompletion = async (generationId: string) => {
    const maxAttempts = 60; // 最大5分（60回 × 5秒）
    let attempts = 0;

    const poll = async () => {
      // ページが非表示の場合でもポーリングは続ける（即座タブ移動対策）
      attempts++;

      try {
        const statusRes = await fetch(`/api/menu/status/${generationId}`);

        if (!statusRes.ok) {
          throw new Error("ステータス確認に失敗しました");
        }

        const statusData = await statusRes.json();

        if (statusData.status === "completed") {
          // 生成完了
          setGenerated(statusData.data);
          setUsage((prev) =>
            prev
              ? {
                  ...prev,
                  today: prev.today + 1,
                  remaining: Math.max(0, prev.remaining - 1),
                }
              : null,
          );
          setLoading(false);
          setCurrentGenerationId(null);
          localStorage.removeItem("menuGenerationState");
        } else if (statusData.status === "failed") {
          // 生成失敗
          throw new Error("献立生成に失敗しました");
        } else if (
          statusData.status === "pending" ||
          statusData.status === "processing"
        ) {
          // まだ処理中
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // 5秒后再試行
          } else {
            throw new Error("生成がタイムアウトしました");
          }
        }
      } catch (pollError: any) {
        setError(pollError.message);
        setLoading(false);
        setCurrentGenerationId(null);
        localStorage.removeItem("menuGenerationState");
      }
    };

    // 開始ポーリング
    poll();
  };

  const handleSelectMenu = async (type: string) => {
    if (!generated?.menuGenerationId) return;

    // Get the selected menu data
    let menuData;
    if (type === "main") menuData = generated.menus.main;
    else if (type === "altA") menuData = generated.menus.alternativeA;
    else menuData = generated.menus.alternativeB;

    setSelectedMenuType(type);
    setSelectedMenuData(menuData);
    setLoadingRecipe(true);
    setRecipeDetails([]);
    setCurrentDishIndex(0);

    // Fetch recipe details for each dish
    try {
      const details: RecipeDetail[] = [];
      for (const dish of menuData.dishes) {
        try {
          const res = await fetch("/api/getRecipeDetail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: dish.name,
              servings: 2,
            }),
          });

          if (
            !res.ok ||
            !res.headers.get("content-type")?.includes("application/json")
          ) {
            throw new Error(`Failed to fetch recipe for ${dish.name}`);
          }

          const data = await res.json();
          if (data.recipe) {
            details.push(data.recipe);
          }
        } catch (dishError) {
          console.error("Failed to fetch dish detail:", dish.name, dishError);
          // Add a fallback recipe from dish data
          details.push({
            title: dish.name,
            description: dish.description || "",
            servings: 2,
            time_minutes: dish.cookingTime || 20,
            difficulty: "中",
            ingredients:
              dish.ingredients?.map((ing: any) => ({
                name: ing.name,
                quantity_per_serving: ing.amount / 2,
                unit: ing.unit,
                total_quantity: ing.amount,
                optional: false,
              })) || [],
            steps: dish.steps || ["材料を準備する", "調理する", "盛り付ける"],
            tips: dish.tips ? [dish.tips] : [],
          });
        }
      }
      setRecipeDetails(details);
    } catch (e) {
      console.error("Failed to fetch recipe details", e);
    } finally {
      setLoadingRecipe(false);
    }
  };

  const [loadingCook, setLoadingCook] = useState(false);

  const handleConfirmCook = async () => {
    if (!generated?.menuGenerationId || !selectedMenuType || loadingCook)
      return;

    setLoadingCook(true);
    try {
      const res = await fetch("/api/menu/cook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuGenerationId: generated.menuGenerationId,
          selectedMenu: selectedMenuType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "調理記録に失敗しました");
      }

      alert("調理完了！在庫から食材が差し引かれました。");

      // 全ての状態をリセットして初期画面に戻る
      setGenerated(null);
      setSelectedMenuType(null);
      setSelectedMenuData(null);
      setRecipeDetails([]);
      setCurrentDishIndex(0);
    } catch (e: any) {
      alert(`エラーが発生しました: ${e.message}`);
    } finally {
      setLoadingCook(false);
    }
  };

  const closeRecipeModal = () => {
    setSelectedMenuType(null);
    setSelectedMenuData(null);
    setRecipeDetails([]);
    setCurrentDishIndex(0);
  };

  const currentRecipe = recipeDetails[currentDishIndex];

  return (
    <ErrorBoundary>
      <PageTransition className="max-w-4xl mx-auto px-4 py-8 pb-32">
        <HeaderTransition className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              AI献立提案
            </h1>
            <button
              onClick={() => router.push("/history")}
              className="text-xs flex items-center gap-1 bg-[var(--surface-bg)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--color-text-secondary)] px-3 py-1.5 rounded-full transition"
            >
              <History size={14} />
              履歴
            </button>
          </div>
          {isPro && (
            <a
              href="/menu/weekly"
              className="text-sm font-medium flex items-center px-3 py-1.5 rounded-full transition"
              style={{
                background:
                  "color-mix(in srgb, var(--accent) 10%, transparent)",
                color: "var(--accent)",
                border: "1px solid var(--surface-border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "color-mix(in srgb, var(--accent) 20%, transparent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "color-mix(in srgb, var(--accent) 10%, transparent)";
              }}
            >
              <Calendar size={16} />
              1週間分を作成する
            </a>
          )}
        </HeaderTransition>

        <ContentTransition className="space-y-6">
          {isPro && (
            <div className="flex justify-end">
              <a
                href="/settings/expiration"
                className="text-xs flex items-center gap-1 transition"
                style={{
                  color: "var(--color-text-secondary)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--color-text-secondary)";
                }}
              >
                <Lightbulb size={12} />
                賞味期限の優先度設定
              </a>
            </div>
          )}

          {!generated && (
            <div className="modal-card rounded-lg shadow-sm p-8 text-center relative overflow-hidden">
              {usage && !isPro && (
                <div
                  className="absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded"
                  style={{
                    background: "var(--surface-bg)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  1日1回
                </div>
              )}
              {usage && isPro && (
                <div
                  className="absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded"
                  style={{
                    background: "var(--surface-bg)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  1日5回
                </div>
              )}
              <div className="mb-6">
                <ChefHat
                  size={48}
                  className="mx-auto mb-2"
                  style={{ color: "var(--accent)" }}
                />
                <h2
                  className="text-xl font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  冷蔵庫の食材から献立を考えます
                </h2>
                <p
                  className="mt-2"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  現在、在庫が{" "}
                  <span
                    className="font-bold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {inventoryCount ?? "-"}
                  </span>{" "}
                  品あります。
                  <br />
                  そのうち{" "}
                  <span className="font-bold" style={{ color: "#f59e0b" }}>
                    {expiringCount ?? "-"}
                  </span>{" "}
                  品の賞味期限が迫っています。
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  loading ? "cursor-not-allowed" : ""
                }`}
                style={{
                  background: loading
                    ? "color-mix(in srgb, var(--accent) 70%, transparent)"
                    : "var(--accent)",
                  color: "#fff",
                }}
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
                <div className="mt-4 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded flex items-center gap-2 justify-center border border-red-100 dark:border-red-900/30">
                  <AlertTriangle size={16} />
                  {error}
                  <button
                    onClick={handleGenerate}
                    className="ml-2 underline text-sm"
                  >
                    再試行
                  </button>
                </div>
              )}
            </div>
          )}

          {generated && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--color-text-primary)]">
                  <CheckCircle size={20} className="text-green-500" />
                  おすすめの献立
                </h2>
                <button
                  onClick={() => setGenerated(null)}
                  className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  戻る
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MenuCard
                  type="main"
                  menu={{
                    name: generated.menus.main?.title || "献立",
                    description: generated.menus.main?.reason || "",
                    cookingTime: calculateCookingTime(
                      generated.menus.main?.dishes || [],
                    ),
                    difficulty: calculateDifficulty(
                      generated.menus.main?.dishes || [],
                    ),
                    calories: generated.nutrition?.main?.total?.calories
                      ? `${Math.round(generated.nutrition.main.total.calories)} kcal`
                      : "N/A",
                    dishes: generated.menus.main?.dishes || [],
                  }}
                  availability={
                    generated.availability?.main || {
                      available: [],
                      missing: [],
                      insufficient: [],
                    }
                  }
                  nutrition={generated.nutrition?.main}
                  onSelect={() => handleSelectMenu("main")}
                  isBest={true}
                  isPro={isPro}
                  onAddToShoppingList={handleAddToShoppingList}
                />

                <MenuCard
                  type="altA"
                  menu={{
                    name: generated.menus.alternativeA?.title || "代替案A",
                    description: generated.menus.alternativeA?.reason || "",
                    cookingTime: calculateCookingTime(
                      generated.menus.alternativeA?.dishes || [],
                    ),
                    difficulty: calculateDifficulty(
                      generated.menus.alternativeA?.dishes || [],
                    ),
                    calories: generated.nutrition?.altA?.total?.calories
                      ? `${Math.round(generated.nutrition.altA.total.calories)} kcal`
                      : "N/A",
                    dishes: generated.menus.alternativeA?.dishes || [],
                  }}
                  availability={
                    generated.availability?.altA || {
                      available: [],
                      missing: [],
                      insufficient: [],
                    }
                  }
                  nutrition={generated.nutrition?.altA}
                  onSelect={() => handleSelectMenu("altA")}
                  isPro={isPro}
                  onAddToShoppingList={handleAddToShoppingList}
                />

                <MenuCard
                  type="altB"
                  menu={{
                    name: generated.menus.alternativeB?.title || "代替案B",
                    description: generated.menus.alternativeB?.reason || "",
                    cookingTime: calculateCookingTime(
                      generated.menus.alternativeB?.dishes || [],
                    ),
                    difficulty: calculateDifficulty(
                      generated.menus.alternativeB?.dishes || [],
                    ),
                    calories: generated.nutrition?.altB?.total?.calories
                      ? `${Math.round(generated.nutrition.altB.total.calories)} kcal`
                      : "N/A",
                    dishes: generated.menus.alternativeB?.dishes || [],
                  }}
                  availability={
                    generated.availability?.altB || {
                      available: [],
                      missing: [],
                      insufficient: [],
                    }
                  }
                  nutrition={generated.nutrition?.altB}
                  onSelect={() => handleSelectMenu("altB")}
                  isPro={isPro}
                  onAddToShoppingList={handleAddToShoppingList}
                />
              </div>
            </div>
          )}
        </ContentTransition>
      </PageTransition>

      {/* Recipe Detail Modal */}
      <AnimatePresence>
        {selectedMenuType && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.stopPropagation()} // 背景クリックを無効化
          >
            <motion.div
              className="fixed inset-x-0 bottom-0 max-h-[90vh] bg-[var(--card-bg)] border border-[var(--surface-border)] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Header */}
              <div className="sticky top-0 bg-[var(--card-bg)] border-b border-[var(--surface-border)] px-4 py-3 flex items-center justify-center z-10">
                <h2 className="font-bold text-lg text-[var(--color-text-primary)]">
                  {selectedMenuData?.title || "レシピ詳細"}
                </h2>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 pb-32">
                {loadingRecipe ? (
                  <div className="text-center py-20">
                    <div className="animate-spin h-8 w-8 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-[var(--color-text-secondary)]">
                      レシピを取得中...
                    </p>
                  </div>
                ) : recipeDetails.length > 0 ? (
                  <>
                    {/* Dish Tabs */}
                    {recipeDetails.length > 1 && (
                      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {recipeDetails.map((r, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentDishIndex(idx)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                              currentDishIndex === idx
                                ? "bg-[var(--accent)] text-white"
                                : "bg-[var(--surface-bg)] text-[var(--color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                            }`}
                          >
                            {r.title}
                          </button>
                        ))}
                      </div>
                    )}

                    {currentRecipe && (
                      <div className="space-y-6">
                        {/* Title & Info */}
                        <div>
                          <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                            {currentRecipe.title}
                          </h3>
                          {currentRecipe.description && (
                            <p className="text-[var(--color-text-secondary)] text-sm">
                              {currentRecipe.description}
                            </p>
                          )}
                          <div className="flex gap-4 mt-3 text-sm text-[var(--color-text-secondary)]">
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {currentRecipe.time_minutes}分
                            </span>
                            <span>難易度: {currentRecipe.difficulty}</span>
                            <span>{currentRecipe.servings}人前</span>
                          </div>
                        </div>

                        {/* Ingredients */}
                        <div className="bg-[var(--surface-bg)] rounded-xl p-4 border border-[var(--surface-border)]">
                          <h4 className="font-bold text-[var(--color-text-primary)] mb-3">
                            材料
                          </h4>
                          <ul className="space-y-2">
                            {currentRecipe.ingredients.map((ing, idx) => (
                              <li
                                key={idx}
                                className="flex justify-between text-sm border-b border-[var(--surface-border)] pb-1"
                              >
                                <span className="text-[var(--color-text-primary)]">
                                  {ing.name}
                                  {ing.optional && (
                                    <span className="text-xs text-[var(--color-text-muted)] ml-1">
                                      (お好みで)
                                    </span>
                                  )}
                                </span>
                                <span className="text-[var(--color-text-secondary)]">
                                  {ing.total_quantity}
                                  {ing.unit}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Steps */}
                        <div>
                          <h4 className="font-bold text-[var(--color-text-primary)] mb-3">
                            作り方
                          </h4>
                          <ol className="space-y-4">
                            {currentRecipe.steps.map((step, idx) => (
                              <li key={idx} className="flex gap-3">
                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent)] text-sm font-bold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <p className="text-[var(--color-text-primary)] text-sm leading-relaxed pt-0.5">
                                  {step}
                                </p>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Tips */}
                        {currentRecipe.tips &&
                          currentRecipe.tips.length > 0 && (
                            <div className="bg-[color-mix(in_srgb,#f59e0b_10%,transparent)] border border-[color-mix(in_srgb,#f59e0b_20%,transparent)] rounded-xl p-4">
                              <h4 className="font-bold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                                <Lightbulb size={16} />
                                コツ・ポイント
                              </h4>
                              <ul className="space-y-1">
                                {currentRecipe.tips.map((tip, idx) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2"
                                  >
                                    <span className="text-amber-500">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {/* Storage */}
                        {currentRecipe.storage && (
                          <div className="text-sm text-[var(--color-text-secondary)] bg-[var(--surface-bg)] rounded-lg p-3 border border-[var(--surface-border)]">
                            <span className="font-medium text-[var(--color-text-primary)]">
                              保存方法:
                            </span>{" "}
                            {currentRecipe.storage}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-20 text-[var(--color-text-secondary)]">
                    レシピを取得できませんでした
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-[var(--card-bg)] border-t border-[var(--surface-border)] p-4">
                <button
                  onClick={handleConfirmCook}
                  disabled={loadingCook}
                  className={`w-full py-3 rounded-xl font-bold shadow-lg transition flex items-center justify-center gap-2 ${
                    loadingCook
                      ? "bg-[var(--surface-bg)] cursor-not-allowed text-[var(--color-text-muted)]"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {loadingCook ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <CheckCircle size={20} />
                  )}
                  {loadingCook ? "処理中..." : "調理完了！完成"}
                </button>
                <p className="text-center text-xs text-[var(--color-text-muted)] mt-2">
                  使用した食材が在庫から差し引かれます
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedMenuType && <NavBar />}
    </ErrorBoundary>
  );
}
