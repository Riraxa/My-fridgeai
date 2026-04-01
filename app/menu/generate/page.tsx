// GENERATED_BY_AI: 2026-03-18 antigravity
//app/menu/generate/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import MenuCard from "@/app/components/menu-card";
import ErrorBoundary from "@/app/components/error-boundary";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Clock,
  ChefHat,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  History,
  Calendar,
  Users,
  Coins,
  Lock,
  Unlock,
  Info,
  ShoppingCart,
  X,
} from "lucide-react";
import PageTransition, {
  HeaderTransition,
  ContentTransition,
} from "@/app/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { useFridge } from "@/app/components/FridgeProvider";
import { toast } from "sonner";
import { Toggle } from "@/app/components/ui/Toggle";
import { DEFAULT_IMPLICIT_INGREDIENTS } from "@/lib/constants/implicit-ingredients";

// Helper to calculate total cooking time from dishes
const calculateCookingTime = (dishes: { cookingTime?: number }[]) => {
  if (!dishes) return "20分";
  const sum = dishes.reduce(
    (acc: number, d: { cookingTime?: number }) => acc + (d.cookingTime ?? 0),
    0,
  );
  return sum > 0 ? `${sum}分` : "20分";
};

// Helper to calculate max difficulty
const calculateDifficulty = (dishes: { difficulty?: number }[]) => {
  if (!dishes) return "★3";
  const nums = dishes.map((d: { difficulty?: number }) => d.difficulty ?? 3);
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

function MenuGeneratePage() {
  // 既存のコンポーネントロジック
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const { setShopping, isNavBarVisible, setIsNavBarVisible } = useFridge();
  const source = searchParams?.get("source") === "onboarding" ? "onboarding" : "default";

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [thoughtStream, setThoughtStream] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Use session plan if available, otherwise fallback to null (loading)
  const sessionIsPro = !!(session?.user && (session.user as any).plan === "PRO");
  const [isPro, setIsPro] = useState<boolean | null>(
    sessionStatus === "loading" || sessionStatus === "unauthenticated" ? (sessionStatus === "unauthenticated" ? false : null) : sessionIsPro
  );
  const [isProLoading, setIsProLoading] = useState(sessionStatus === "loading");
  const [usage, setUsage] = useState<{
    today: number;
    limit: number;
    remaining: number;
  } | null>(null);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(
    null,
  );

  // ステップ管理 (献立生成)
  const progressSteps = {
    preparing: "準備中...",
    generating: "AI献立生成中...",
    calculating: "栄養計算中...",
    validating: "最終確認中...",
    completed: "完了"
  };
  const [currentProgressStep, setCurrentProgressStep] = useState<string>("preparing");

  // 献立生成中の進捗ステップ更新
  useEffect(() => {
    if (!loading) {
      setCurrentProgressStep("preparing");
    }
  }, [loading]);

  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [expiringCount, setExpiringCount] = useState<number | null>(null);

  // ステップ管理 (レシピ取得)
  const [retrievingDishName, setRetrievingDishName] = useState<string | null>(null);
  const [recipeProgressStep, setRecipeProgressStep] = useState<string>("fetching-dish-1");
  const [totalDishes, setTotalDishes] = useState<number>(0);

  // Conditions
  const [servings, setServings] = useState(2); // Default 2
  const [enableBudget, setEnableBudget] = useState(false);
  const [budget, setBudget] = useState<number | "">("")

  // Constraint Mode
  const [strictMode, setStrictMode] = useState(false);
  const [insufficientError, setInsufficientError] = useState(false);
  const [showImplicitList, setShowImplicitList] = useState(false);

  // Recipe Detail Modal State
  const [selectedMenuType, setSelectedMenuType] = useState<string | null>(null);
  const [selectedMenuData, setSelectedMenuData] = useState<any>(null);
  const [recipeDetails, setRecipeDetails] = useState<RecipeDetail[]>([]);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [errorRecipe, setErrorRecipe] = useState<string | null>(null);
  const [currentDishIndex, setCurrentDishIndex] = useState(0);

  // 買い物リストに材料を追加する関数
  const handleAddToShoppingList = async (ingredients: string[]) => {
    try {
      // 既存の買い物リストに追加
      setShopping((prev) => {
        const existing = prev ?? [];
        // 重複を避けるために既存のアイテムをチェック
        const filtered = ingredients.filter(
          (ingredient) =>
            !existing.some((item: { name: string }) => item.name === ingredient),
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
    // ページ読み込み時に状態を復元 from localStorage (Processing State)
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

    // Restore generated result from sessionStorage (Result State)
    const savedResult = sessionStorage.getItem("menuGeneratedResult");
    if (savedResult) {
      try {
        const parsed = JSON.parse(savedResult);
        setGenerated(parsed);
      } catch (e) {
        console.error("Failed to restore generated menu:", e);
        sessionStorage.removeItem("menuGeneratedResult");
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

  // ブラウザの戻る操作をブロック
  useEffect(() => {
    if (isNavBarVisible) return;

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      toast("調理を中断する場合は、戻るボタン等でキャンセルしてください。", {
        id: "nav-block-toast",
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isNavBarVisible]);

  // アプリ内操作制限 - レシピモーダル表示中はアプリ内の操作のみ無効化
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): boolean => {
      // ESCキーでモーダルが閉じるのを防止（レシピ取得中も含む）
      if (e.key === "Escape") {
        const currentSelectedMenuType = selectedMenuType;
        const currentLoadingRecipe = loadingRecipe;
        if (currentSelectedMenuType || currentLoadingRecipe) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }

      // F5（リロード）とCtrl+Rのみ防止（ブラウザ操作は許可）
      if ((selectedMenuType || loadingRecipe) && (
        e.key === "F5" ||
        (e.ctrlKey && e.key === "r")
      )) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      return true;
    };

    // イベントリスナー登録（キャプチャフェーズで優先的に処理）
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [selectedMenuType, loadingRecipe]);

  // Sync isPro with session when it changes
  useEffect(() => {
    if (sessionStatus !== "loading") {
      const pro = (session?.user as any)?.plan === "PRO";
      setIsPro(pro);
      setIsProLoading(false);
    }
  }, [session, sessionStatus]);

  // Fetch usage and inventory summary
  useEffect(() => {
    async function fetchData() {
      try {
        const userRes = await fetch("/api/user/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          // Keep isPro from session as source of truth, but can update if mismatch
          if (userData.user?.plan === "PRO" && !isPro && sessionStatus !== "loading") {
            setIsPro(true);
          }
          setUsage(userData.usage);
        }
      } catch (e) {
        console.error("Failed to fetch user data", e);
      } finally {
        // Only set loading false if session also finished
        if (sessionStatus !== "loading") {
          setIsProLoading(false);
        }
      }

      try {
        const res = await fetch("/api/ingredients");
        if (res.ok) {
          const data = await res.json();
          const ingredients = data.items ?? [];
          setInventoryCount(ingredients.length);

          const now = new Date();
          const count = ingredients.filter((i: { expirationDate?: string }) => {
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

  // Ensure navigation bar is visible when page loads
  useEffect(() => {
    setIsNavBarVisible(true);
  }, [setIsNavBarVisible]);

  const handleGenerate = async () => {
    setLoading(true);
    setIsStreaming(true);
    setStreamingText("");
    setThoughtStream([]);
    setError(null);

    try {
      const res = await fetch("/api/menu/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servings,
          budget: enableBudget && budget ? Number(budget) : null,
          mode: strictMode ? "strict" : "flexible",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error ?? "生成の開始に失敗しました");
      }

      // レスポンスヘッダーから生成IDを取得
      const generationId = res.headers.get("x-menu-generation-id");
      if (generationId) {
        setCurrentGenerationId(generationId);
        localStorage.setItem(
          "menuGenerationState",
          JSON.stringify({
            loading: true,
            currentGenerationId: generationId,
            timestamp: Date.now(),
          }),
        );
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Stream reader not available");

      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setStreamingText(fullText);
        
        // 思考プロセスの箇条書きを抽出 (行単位で処理)
        if (chunk.includes('\n')) {
           const allLines = fullText.split('\n');
           const bullets = allLines.filter(l => {
             const trimmed = l.trim();
             return trimmed.startsWith('-') || trimmed.startsWith('・');
           });
           setThoughtStream(bullets.map(l => l.trim().replace(/^[-・]\s*/, '')));
        }
      }

      setIsStreaming(false);

      // ストリーミング終了後、バックエンドの finalize を待つためにポーリングを開始
      if (generationId) {
        pollForCompletion(generationId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setLoading(false);
      setIsStreaming(false);
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

        // 進捗ステップを更新
        if (statusData.progressStep) {
          setCurrentProgressStep(statusData.progressStep);
        }

        if (statusData.status === "completed") {
          // 生成完了
          setGenerated(statusData.data);
          sessionStorage.setItem(
            "menuGeneratedResult",
            JSON.stringify(statusData.data),
          );
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
          // Strict モードで生成失敗 → INSUFFICIENT_INVENTORY を疑う
          if (strictMode) {
            setInsufficientError(true);
            setLoading(false);
            setCurrentGenerationId(null);
            localStorage.removeItem("menuGenerationState");
            return;
          }
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
      } catch (pollError: unknown) {
        setError(pollError instanceof Error ? pollError.message : "ポーリングエラーが発生しました");
        setLoading(false);
        setCurrentGenerationId(null);
        localStorage.removeItem("menuGenerationState");
      }
    };

    // 開始ポーリング
    poll();
  };

  const handleSelectMenu = async (type: string) => {
    if (!generated?.menuGenerationId || loadingRecipe) return;

    // Get the selected menu data
    let menuData;
    if (type === "main") menuData = generated.menus.main;
    else if (type === "altA") menuData = generated.menus.alternativeA;
    else menuData = generated.menus.alternativeB;

    setSelectedMenuType(type);
    setSelectedMenuData(menuData);
    setLoadingRecipe(true);
    setErrorRecipe(null);
    setRecipeDetails([]);
    setCurrentDishIndex(0);
    setIsNavBarVisible(false);

    // 料理数を設定
    const dishCount = menuData.dishes?.length || 0;
    setTotalDishes(dishCount);

    // Fetch recipe details for each dish
    try {
      const details: RecipeDetail[] = [];
      for (let i = 0; i < menuData.dishes.length; i++) {
        const dish = menuData.dishes[i];
        
        // 進捗ステップを更新
        const stepNumber = i + 1;
        setRecipeProgressStep(`fetching-dish-${stepNumber}`);
        setRetrievingDishName(dish.name);
        
        try {
          const res = await fetch("/api/getRecipeDetail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: dish.name,
              servings: servings,
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
            description: dish.description ?? "",
            servings: servings,
            time_minutes: dish.cookingTime ?? 20,
            difficulty: "中",
            ingredients:
              dish.ingredients?.map((ing: { name: string; amount: number; unit: string }) => ({
                name: ing.name,
                quantity_per_serving: ing.amount / servings,
                unit: ing.unit,
                total_quantity: ing.amount,
                optional: false,
              })) ?? [],
            steps: dish.steps ?? ["材料を準備する", "調理する", "盛り付ける"],
            tips: dish.tips ? [dish.tips] : [],
          });
        }
      }
      setRecipeDetails(details);
    } catch (e) {
      console.error("Failed to fetch recipe details", e);
      setErrorRecipe("レシピの取得に失敗しました。再試行してください。");
    } finally {
      setLoadingRecipe(false);
      setRetrievingDishName(null);
      setRecipeProgressStep("fetching-dish-1");
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
        throw new Error(data.error ?? "調理記録に失敗しました");
      }

      alert("調理完了！在庫から食材が差し引かれました。");

      // 全ての状態をリセットして初期画面に戻る
      setGenerated(null);
      sessionStorage.removeItem("menuGeneratedResult");
      setSelectedMenuType(null);
      setSelectedMenuData(null);
      setRecipeDetails([]);
      setCurrentDishIndex(0);
      setIsNavBarVisible(true);
    } catch (e: unknown) {
      alert(`エラーが発生しました: ${e instanceof Error ? e.message : "不明なエラー"}`);
    } finally {
      setLoadingCook(false);
    }
  };

  const closeRecipeModal = () => {
    setSelectedMenuType(null);
    setSelectedMenuData(null);
    setRecipeDetails([]);
    setCurrentDishIndex(0);
    setErrorRecipe(null);
    setIsNavBarVisible(true);
  };

  const currentRecipe = recipeDetails[currentDishIndex];

  return (
    <ErrorBoundary>
      <PageTransition
        className="max-w-4xl mx-auto px-4 py-8 pb-32"
        aria-hidden={!isNavBarVisible}
      >
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
          <div className="flex items-center" style={{ minHeight: "36px", minWidth: "120px", justifyContent: "flex-end" }}>
            {!isProLoading && isPro === true && (
              <a
                href="/menu/weekly"
                className="text-sm font-medium flex items-center px-3 py-1.5 rounded-full transition whitespace-nowrap"
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
          </div>
        </HeaderTransition>

        <ContentTransition className="space-y-6">
          <div className="flex justify-end" style={{ minHeight: "18px" }}>
            {!isProLoading && isPro === true && (
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
            )}
          </div>

          {!generated && (
            <div className="modal-card rounded-lg shadow-sm p-8 text-center relative overflow-hidden">
              {usage && (
                <div
                  className="absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded"
                  style={{
                    background: "var(--surface-bg)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {isPro === true ? "1日3回" : "1日1回"}
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

              {/* Constraint Mode Toggle */}
              <div className="max-w-md mx-auto mb-4">
                <div className="bg-[var(--surface-bg)] rounded-lg p-4 border border-[var(--surface-border)]">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2 text-[var(--color-text-primary)] cursor-pointer">
                      {strictMode ? (
                        <Lock size={16} className="text-[var(--accent)]" />
                      ) : (
                        <Unlock size={16} className="text-[var(--color-text-muted)]" />
                      )}
                      冷蔵庫内の食材のみで献立を生成
                    </label>
                    <Toggle
                      checked={strictMode}
                      onChange={() => setStrictMode(!strictMode)}
                    />
                  </div>

                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    {strictMode
                      ? "ONの場合、現在の在庫にある食材のみで献立を生成します（基本調味料は含まれます）"
                      : "OFFの場合、在庫食材を優先しつつ、不足分を一部許可します"}
                  </p>
                </div>
              </div>

              {/* Conditions UI */}
              <div className="max-w-md mx-auto mb-8 space-y-4 text-left">
                {/* Servings */}
                <div className="bg-[var(--surface-bg)] rounded-lg p-4 border border-[var(--surface-border)]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium flex items-center gap-2 text-[var(--color-text-primary)]">
                      <Users size={16} className="text-[var(--accent)]" />
                      人数
                    </label>
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">
                      {servings}人前
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={servings}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val > 8) {
                        toast("最大8人前までです", {
                          description:
                            "8人以上の献立は分割して生成してください。",
                        });
                        setServings(8);
                      } else {
                        setServings(val);
                      }
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                  />
                  <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
                    <span>1人</span>
                    <span>8人</span>
                  </div>
                </div>

                {/* Budget (Pro Only) */}
                <div className={`bg-[var(--surface-bg)] rounded-lg p-4 border border-[var(--surface-border)] overflow-hidden relative ${!isPro ? "min-h-[200px]" : ""}`}>
                  {!isPro && (
                    <div className="absolute inset-0 bg-[var(--background)]/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                      <div className="bg-amber-500 text-white p-3 rounded-2xl mb-3 shadow-xl shadow-amber-100">
                        <Coins size={24} />
                      </div>
                      <h3 className="text-base font-extrabold mb-1 text-[var(--color-text-primary)]">
                        1食あたりの予算設定
                      </h3>
                      <p className="text-xs text-slate-500 mb-4">
                        Proプランで予算を設定できます。コスパ重視や特別な日の献立を調整できます。
                      </p>
                      <button
                        onClick={() => router.push("/settings/account")}
                        className="bg-amber-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-amber-100 hover:scale-105 active:scale-95 transition text-sm"
                      >
                        Proにアップグレード
                      </button>
                    </div>
                  )}
                  <div inert={!isPro || undefined} className={!isPro ? "pointer-events-none" : ""}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium flex items-center gap-2 text-[var(--color-text-primary)]">
                        <Coins size={16} className="text-[var(--accent)]" />
                        1食あたりの予算
                        <span className="text-[10px] bg-[var(--accent)] text-white px-1.5 py-0.5 rounded-full">
                          Pro
                        </span>
                      </label>
                      <Toggle
                        checked={enableBudget}
                        onChange={() => {
                          setEnableBudget(!enableBudget);
                          if (!enableBudget && !budget) setBudget(500);
                        }}
                      />
                    </div>

                    {enableBudget && (
                      <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                        <div className="relative">
                          <input
                            type="number"
                            value={budget}
                            onChange={(e) =>
                              setBudget(
                                e.target.value === ""
                                  ? ""
                                  : parseInt(e.target.value),
                              )
                            }
                            placeholder="例: 500"
                            className="w-full p-2 pl-3 pr-8 border border-[var(--surface-border)] rounded bg-[var(--card-bg)] focus:ring-2 focus:ring-[var(--accent)] focus:outline-none no-spinner"
                          />
                          <span className="absolute right-3 top-2.5 text-sm text-[var(--color-text-muted)]">
                            円/人
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          ※あくまで目安として考慮されます
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${loading ? "cursor-not-allowed" : ""
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

              {loading && (
                <div className="mt-8 max-w-lg mx-auto">
                  <div className="relative mb-6 flex justify-center">
                    <motion.div
                      animate={{
                        y: [0, -8, 0],
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <ChefHat size={56} className="text-[var(--accent)] opacity-90" />
                    </motion.div>
                    <motion.div
                      className="absolute -top-2 right-1/4 text-xl"
                      animate={{ opacity: [0, 1, 0], y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      💡
                    </motion.div>
                  </div>

                  {/* AI Thought Stream UI */}
                  <div className="modal-card rounded-xl p-6 mb-6 text-left border border-[var(--surface-border)] bg-[var(--surface-bg)] shadow-lg overflow-hidden relative">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--surface-border)]">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                      </div>
                      <span className="text-[10px] font-mono text-[var(--color-text-muted)] ml-2 uppercase tracking-widest">
                        AI Thought Stream
                      </span>
                    </div>

                    <div className="space-y-3 font-mono">
                      {thoughtStream.length > 0 ? (
                        thoughtStream.map((thought, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-3 text-xs leading-relaxed"
                          >
                            <span className="text-[var(--accent)] shrink-0">›</span>
                            <span className="text-[var(--color-text-primary)]">{thought}</span>
                          </motion.div>
                        ))
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] animate-pulse">
                          <span className="text-[var(--accent)]">›</span>
                          <span>冷蔵庫の在庫をスキャン中...</span>
                        </div>
                      )}
                      
                      {isStreaming && (
                        <div className="flex gap-3 text-xs">
                          <span className="text-[var(--accent)] shrink-0">›</span>
                          <motion.span 
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="w-1.5 h-4 bg-[var(--accent)] inline-block"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 px-4">
                    <div className="relative h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        className="absolute top-0 left-0 h-full bg-[var(--accent)]"
                        initial={{ width: "0%" }}
                        animate={{ 
                          width: generated ? "100%" : (isStreaming ? "70%" : "90%")
                        }}
                        transition={{ duration: 1 }}
                      />
                    </div>

                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-tighter">
                      {isStreaming ? "AI Generating Plan..." : "Finalizing Recipe Details..."}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 text-[var(--semantic-red)] bg-red-50 dark:bg-red-950/20 p-3 rounded flex items-center gap-2 justify-center border border-red-100 dark:border-red-900/30">
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

              {/* Strict モード失敗モーダル (INSUFFICIENT_INVENTORY) */}
              <AnimatePresence>
                {insufficientError && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setInsufficientError(false)}
                  >
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="modal-card rounded-xl shadow-xl p-6 max-w-sm w-full relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setInsufficientError(false)}
                        className="absolute top-3 right-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition"
                      >
                        <X size={18} />
                      </button>

                      <div className="text-center">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                          <AlertTriangle size={24} className="text-amber-500" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
                          献立を生成できません
                        </h3>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                          現在の在庫では条件を満たす献立を作成できません。食材を追加するか、モードを「一部許可」に変更して再度お試しください。
                        </p>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              setInsufficientError(false);
                              setStrictMode(false);
                            }}
                            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white transition"
                            style={{ background: "var(--accent)" }}
                          >
                            <Unlock size={14} className="inline mr-1" />
                            「一部許可」モードに切り替え
                          </button>
                          <button
                            onClick={() => {
                              setInsufficientError(false);
                              router.push("/features/ingredients-recipes");
                            }}
                            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition border"
                            style={{
                              borderColor: "var(--surface-border)",
                              color: "var(--color-text-primary)",
                            }}
                          >
                            <ShoppingCart size={14} className="inline mr-1" />
                            食材を追加する
                          </button>
                          <button
                            onClick={() => setInsufficientError(false)}
                            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition"
                          >
                            閉じる
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
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
                  onClick={() => {
                    setGenerated(null);
                    sessionStorage.removeItem("menuGeneratedResult");
                  }}
                  className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  戻る
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MenuCard
                  _type="main"
                  menu={{
                    name: generated.menus.main?.title ?? "献立",
                    description: generated.menus.main?.reason ?? "",
                    cookingTime: calculateCookingTime(
                      generated.menus.main?.dishes ?? [],
                    ),
                    difficulty: calculateDifficulty(
                      generated.menus.main?.dishes ?? [],
                    ),
                    calories: generated.nutrition?.main?.total?.calories
                      ? `${Math.round(generated.nutrition.main.total.calories)} kcal`
                      : "N/A",
                    dishes: generated.menus.main?.dishes ?? [],
                  }}
                  availability={
                    generated.availability?.main ?? {
                      available: [],
                      missing: [],
                      insufficient: [],
                    }
                  }
                  nutrition={generated.nutrition?.main}
                  onSelect={() => handleSelectMenu("main")}
                  isBest={true}
                  isPro={isPro === true}
                  onAddToShoppingList={handleAddToShoppingList}
                />

                <MenuCard
                  _type="altA"
                  menu={{
                    name: generated.menus.alternativeA?.title ?? "代替案A",
                    description: generated.menus.alternativeA?.reason ?? "",
                    cookingTime: calculateCookingTime(
                      generated.menus.alternativeA?.dishes ?? [],
                    ),
                    difficulty: calculateDifficulty(
                      generated.menus.alternativeA?.dishes ?? [],
                    ),
                    calories: generated.nutrition?.altA?.total?.calories
                      ? `${Math.round(generated.nutrition.altA.total.calories)} kcal`
                      : "N/A",
                    dishes: generated.menus.alternativeA?.dishes ?? [],
                  }}
                  availability={
                    generated.availability?.altA ?? {
                      available: [],
                      missing: [],
                      insufficient: [],
                    }
                  }
                  nutrition={generated.nutrition?.altA}
                  onSelect={() => handleSelectMenu("altA")}
                  isPro={isPro === true}
                  onAddToShoppingList={handleAddToShoppingList}
                />

                <MenuCard
                  _type="altB"
                  menu={{
                    name: generated.menus.alternativeB?.title ?? "代替案B",
                    description: generated.menus.alternativeB?.reason ?? "",
                    cookingTime: calculateCookingTime(
                      generated.menus.alternativeB?.dishes ?? [],
                    ),
                    difficulty: calculateDifficulty(
                      generated.menus.alternativeB?.dishes ?? [],
                    ),
                    calories: generated.nutrition?.altB?.total?.calories
                      ? `${Math.round(generated.nutrition.altB.total.calories)} kcal`
                      : "N/A",
                    dishes: generated.menus.alternativeB?.dishes ?? [],
                  }}
                  availability={
                    generated.availability?.altB ?? {
                      available: [],
                      missing: [],
                      insufficient: [],
                    }
                  }
                  nutrition={generated.nutrition?.altB}
                  onSelect={() => handleSelectMenu("altB")}
                  isPro={isPro === true}
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
            {/* アプリ内の操作のみ無効化するオーバーレイ */}
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 max-h-[90vh] bg-[var(--card-bg)] border border-[var(--surface-border)] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col relative z-30"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="recipe-modal-title"
            >
              {/* Header */}
              <div className="sticky top-0 bg-[var(--card-bg)] border-b border-[var(--surface-border)] px-4 py-3 flex items-center justify-center z-10">
                <h2 id="recipe-modal-title" className="font-bold text-lg text-[var(--color-text-primary)]">
                  {selectedMenuData?.title ?? "レシピ詳細"}
                </h2>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 pb-32">
                {loadingRecipe ? (
                  <div className="text-center py-16 px-4">
                    <div className="relative mb-8 flex justify-center">
                      {/* 書き込み中のアニメーション */}
                      <motion.div
                        animate={{
                          x: [0, 5, -5, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <ChefHat size={48} className="text-[var(--accent)] opacity-80" />
                      </motion.div>
                    </div>

                    <div className="max-w-xs mx-auto space-y-4">
                      <h4 className="text-lg font-bold text-[var(--color-text-primary)]">
                        レシピを取得中...
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="relative h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            className="absolute top-0 left-0 h-full bg-[var(--accent)]"
                            initial={{ width: "0%" }}
                            animate={{ width: `${(parseInt(recipeProgressStep?.split('-')[2] || "1") || 1) / totalDishes * 100}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>

                        <AnimatePresence mode="wait">
                          <motion.p
                            key={recipeProgressStep}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-sm font-medium text-[var(--color-text-secondary)]"
                          >
                            {recipeProgressStep === "fetching-dish-1" && "1品目取得中"}
                            {recipeProgressStep === "fetching-dish-2" && "2品目取得中"}
                            {recipeProgressStep === "fetching-dish-3" && "3品目取得中"}
                          </motion.p>
                        </AnimatePresence>
                      </div>

                      <div className="p-4 bg-[var(--surface-bg)] rounded-2xl border border-[var(--surface-border)] relative overflow-hidden">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--semantic-green-bg)] flex items-center justify-center flex-shrink-0">
                            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                          <p className="text-sm font-medium text-left text-[var(--color-text-secondary)] truncate">
                            {retrievingDishName}
                          </p>
                        </div>
                        <motion.div
                          className="absolute bottom-0 left-0 h-0.5 bg-green-500"
                          animate={{
                            width: ["0%", "100%"]
                          }}
                          transition={{
                            duration: 8,
                            repeat: Infinity,
                          }}
                        />
                      </div>
                      <p className="text-[var(--color-text-muted)] text-xs">
                        プロのシェフが手順をていねいに解説しています
                      </p>
                    </div>
                  </div>
                ) : recipeDetails.length > 0 ? (
                  <>
                    {/* Dish Tabs - レシピ取得中は非表示 */}
                    {recipeDetails.length > 1 && !loadingRecipe && (
                      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {recipeDetails.map((r, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentDishIndex(idx)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${currentDishIndex === idx
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
                ) : errorRecipe ? (
                  <div className="text-center py-20 px-6">
                    <AlertTriangle size={40} className="mx-auto mb-4 text-red-500" />
                    <p className="text-[var(--color-text-primary)] font-medium mb-4">
                      {errorRecipe}
                    </p>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => handleSelectMenu(selectedMenuType as string)}
                        className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-bold shadow-md hover:opacity-90 transition"
                      >
                        再取得する
                      </button>
                      <button
                        onClick={closeRecipeModal}
                        className="w-full py-3 bg-[var(--surface-bg)] text-[var(--color-text-secondary)] rounded-xl font-bold border border-[var(--surface-border)] hover:bg-[var(--surface-border)] transition"
                      >
                        戻る
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-[var(--color-text-secondary)]">
                    レシピを取得できませんでした
                  </div>
                )}
              </div>

              {!loadingRecipe && !errorRecipe && recipeDetails.length > 0 && (
                <div className="sticky bottom-0 bg-[var(--card-bg)] border-t border-[var(--surface-border)] p-4 pb-safe relative z-20">
                  <button
                    onClick={handleConfirmCook}
                    disabled={loadingCook}
                    aria-label="調理完了。完成ボタン"
                    className={`w-full py-4 rounded-xl font-bold shadow-lg transition flex items-center justify-center gap-2 ${loadingCook
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
                  <p className="text-center text-[10px] text-[var(--color-text-muted)] mt-2">
                    使用した食材が在庫から差し引かれます
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 以前ここに NavBar がありましたが、RootLayout に統合されました */}
    </ErrorBoundary>
  );
}

// Suspenseでラップしてexport
export default function MenuGeneratePageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <MenuGeneratePage />
    </Suspense>
  );
}
