// app/hooks/useMenuGeneration.ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { detectInventoryPatterns, generateContextAwareMessages } from "@/app/menu/generate/utils";
import type { InventoryPattern } from "@/app/menu/generate/constants";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export const useMenuGeneration = () => {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  // --- External States (SWR) ---
  const { data: rawIngredients, error: swrError, mutate: mutateIngredients, isLoading: ingredientsLoading } = useSWR("/api/ingredients", fetcher);
  const ingredients = Array.isArray(rawIngredients) ? rawIngredients : (rawIngredients?.items || rawIngredients?.ingredients || []);
  
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [expiringCount, setExpiringCount] = useState<number | null>(null);

  // --- Option States ---
  const [servings, setServings] = useState(2);
  const [budget, setBudget] = useState<number | "">("");
  const [enableBudget, setEnableBudget] = useState(false);
  const [strictMode, setStrictMode] = useState(true);

  // --- Generation Status ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [thoughtStream, setThoughtStream] = useState<string[]>([]);
  const [currentThoughtIndex, setCurrentThoughtIndex] = useState(0);

  // --- Recipe Selection / Detail ---
  const [selectedMenuType, setSelectedMenuType] = useState<string | null>(null);
  const [selectedMenuData, setSelectedMenuData] = useState<any>(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [recipeDetails, setRecipeDetails] = useState<any[]>([]);
  const [currentDishIndex, setCurrentDishIndex] = useState(0);
  const [errorRecipe, setErrorRecipe] = useState<string | null>(null);
  const [loadingCook, setLoadingCook] = useState(false);
  const [isNavBarVisible, setIsNavBarVisible] = useState(true);

  // --- Refs ---
  const workerRef = useRef<Worker | null>(null);
  const thoughtIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shuffledMessagesRef = useRef<string[]>([]);

  const initialGeneralMessages = [
    "冷蔵庫の在庫を確認しています...",
    "栄養バランスを計算中...",
    "シェフのおすすめポイントを考案中...",
    "時短テクニックを探しています...",
    "最適な調理順序を組み立てています...",
    "彩りと味の重なりを調整中...",
    "プロ級のレシピ手順を生成しています...",
  ];

  // --- Helpers ---
  const shuffleMessages = useCallback(() => {
    const patterns = detectInventoryPatterns(ingredients, {
      inventoryCount: inventoryCount || 0,
      expiringCount: expiringCount || 0,
      servings,
      budget: typeof budget === "number" ? budget : null,
      strictMode
    });
    shuffledMessagesRef.current = generateContextAwareMessages(patterns, initialGeneralMessages);
  }, [ingredients, inventoryCount, expiringCount, servings, budget, strictMode]);

  const closeRecipeModal = useCallback(() => {
    setSelectedMenuType(null);
    setSelectedMenuData(null);
    setRecipeDetails([]);
    setCurrentDishIndex(0);
    setErrorRecipe(null);
    setIsNavBarVisible(true);
    sessionStorage.removeItem("selectedMenuType");
    sessionStorage.removeItem("currentDishIndex");
  }, []);

  // Sync inventory counts when ingredients data from SWR changes
  useEffect(() => {
    if (ingredients) {
      setInventoryCount(ingredients.length);
      const expiring = ingredients.filter((i: any) => {
        if (!i.expirationDate) return false;
        const diff = new Date(i.expirationDate).getTime() - new Date().getTime();
        return diff < 1000 * 60 * 60 * 24 * 3; // 3 days
      }).length;
      setExpiringCount(expiring);
    }
  }, [ingredients]);

  // Pro status sync
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      setIsPro((session?.user as any)?.plan === "PRO");
    } else if (sessionStatus === "unauthenticated") {
      setIsPro(false);
    }
  }, [sessionStatus, session]);

  // --- Session Restoration ---
  useEffect(() => {
    const savedResult = sessionStorage.getItem("menuGeneratedResult");
    if (savedResult) {
      try {
        const parsed = JSON.parse(savedResult);
        setGenerated(parsed);

        const savedSelectedType = sessionStorage.getItem("selectedMenuType");
        if (savedSelectedType) {
          const menuData = savedSelectedType === "main" ? parsed.menus.main : 
                          savedSelectedType === "altA" ? parsed.menus.alternativeA : null;
          if (menuData) {
            setSelectedMenuType(savedSelectedType);
            setSelectedMenuData(menuData);
            const savedDishIndex = sessionStorage.getItem("currentDishIndex");
            if (savedDishIndex) setCurrentDishIndex(parseInt(savedDishIndex));
          }
        }
      } catch (e) {
        sessionStorage.removeItem("menuGeneratedResult");
      }
    }
    shuffleMessages();
  }, [shuffleMessages]);

  // Persistence
  useEffect(() => {
    if (generated) sessionStorage.setItem("menuGeneratedResult", JSON.stringify(generated));
  }, [generated]);

  useEffect(() => {
    if (selectedMenuType) sessionStorage.setItem("selectedMenuType", selectedMenuType);
  }, [selectedMenuType]);

  useEffect(() => {
    if (selectedMenuType) sessionStorage.setItem("currentDishIndex", currentDishIndex.toString());
  }, [currentDishIndex, selectedMenuType]);

  // Rotation
  useEffect(() => {
    if (loading && thoughtStream.length === 0) {
      thoughtIntervalRef.current = setInterval(() => {
        setCurrentThoughtIndex((prev) => (prev + 1) % shuffledMessagesRef.current.length);
      }, 4000);
    } else {
      if (thoughtIntervalRef.current) clearInterval(thoughtIntervalRef.current);
    }
    return () => {
      if (thoughtIntervalRef.current) clearInterval(thoughtIntervalRef.current);
    };
  }, [loading, thoughtStream.length]);

  // Worker
  useEffect(() => {
    if (typeof window !== "undefined") {
      workerRef.current = new Worker("/polling-worker.js");
      workerRef.current.onmessage = (e) => {
        const { type, data, error: workerErr } = e.data;
        if (type === "status") {
          setIsStreaming(data.status === "processing");
          if (data.status === "completed") {
            // APIレスポンスの data フィールドに実際の献立データが入っている
            setGenerated(data.data || data);
            setLoading(false);
            setIsStreaming(false);
            setCurrentGenerationId(null);
            workerRef.current?.postMessage({ type: "stop" });
            toast.success("献立が完成しました！");
          } else if (data.status === "failed") {
            setError(data.error || "生成に失敗しました");
            setLoading(false);
            setIsStreaming(false);
            workerRef.current?.postMessage({ type: "stop" });
          }
          if (data.thoughts) setThoughtStream(data.thoughts);
        } else if (type === "error") {
          setError(workerErr);
          setLoading(false);
        }
      };
    }
    return () => workerRef.current?.terminate();
  }, []);

  // --- Handlers ---
  const handleGenerate = async () => {
    if (loading || currentGenerationId) return;
    setLoading(true);
    setError(null);
    setGenerated(null);
    setThoughtStream([]);
    setCurrentThoughtIndex(0);
    shuffleMessages();

    try {
      const idempotencyKey = `stream-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const res = await fetch("/api/menu/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servings, budget: enableBudget ? budget : null, mode: strictMode ? "strict" : "flexible", idempotencyKey }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "生成開始に失敗しました");
      const { generationId } = await res.json();
      setCurrentGenerationId(generationId);
      workerRef.current?.postMessage({ 
        type: "start", 
        generationId, 
        url: "/api/menu/status" 
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSelectMenu = async (menuType: string, menuData: any) => {
    setSelectedMenuType(menuType);
    setSelectedMenuData(menuData);
    setLoadingRecipe(true);
    setErrorRecipe(null);
    setRecipeDetails([]);
    setCurrentDishIndex(0);
    setIsNavBarVisible(false);

    try {
      const details = menuData.dishes.map((dish: any) => ({
        title: dish.name,
        description: dish.reason,
        ingredients: dish.ingredients || [],
        steps: dish.steps || [],
        tips: dish.tips || [],
        storage: dish.storage || "当日中にお召し上がりください",
        time_minutes: dish.time_minutes || 0,
        difficulty: dish.difficulty || "普通",
        servings: servings,
      }));

      // Animation effect for recipe loading
      for (let i = 1; i <= details.length; i++) {
        await new Promise(r => setTimeout(r, 200));
        setRecipeDetails(details.slice(0, i));
      }
    } catch (e) {
      setErrorRecipe("レシピデータの読み込みに失敗しました");
    } finally {
      setLoadingRecipe(false);
    }
  };

  const handleConfirmCook = async () => {
    if (!generated?.id || !selectedMenuType || loadingCook) return;
    setLoadingCook(true);
    try {
      const idempotencyKey = `cook-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const res = await fetch("/api/menu/cook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuGenerationId: generated.id, selectedMenu: selectedMenuType, idempotencyKey }),
      });
      if (!res.ok) throw new Error("調理記録に失敗しました");
      toast.success("調理完了！");
      setGenerated(null);
      sessionStorage.removeItem("menuGeneratedResult");
      // Re-validate ingredients after cooking
      mutateIngredients();
      closeRecipeModal();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingCook(false);
    }
  };

  const handleAddToShoppingList = (items: { name: string; quantity?: string | number; unit?: string }[], setShopping: any) => {
    if (!items.length) return;
    
    setShopping((prev: any[]) => {
      const next = [...prev];
      const addedNames: string[] = [];
      
      items.forEach(newItem => {
        // 同じ名前の未完了アイテムがあるかチェック
        const existingIdx = next.findIndex(i => i.name === newItem.name && !i.done);
        if (existingIdx > -1) {
          // 既存アイテムに追記（または上書き）
          next[existingIdx] = {
            ...next[existingIdx],
            note: next[existingIdx].note ? `${next[existingIdx].note} / 追加: ${newItem.quantity}${newItem.unit}` : `追加: ${newItem.quantity}${newItem.unit}`
          };
        } else {
          // 新規追加
          next.push({
            id: `shop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: newItem.name,
            quantity: newItem.quantity,
            unit: newItem.unit,
            done: false,
            createdAt: new Date().toISOString()
          });
        }
        addedNames.push(newItem.name);
      });
      
      toast.success(`${addedNames.length}件の食材を買い物リストに追加しました`, {
        description: addedNames.slice(0, 3).join("、") + (addedNames.length > 3 ? " など" : ""),
        action: {
          label: "リストを表示",
          onClick: () => router.push("/shopping-list")
        }
      });
      
      return next;
    });
  };

  return {
    isPro, inventoryCount, expiringCount, ingredientsLoading,
    servings, budget, enableBudget, strictMode,
    loading, error, generated, isStreaming, thoughtStream, currentThoughtIndex,
    selectedMenuType, selectedMenuData, loadingRecipe, recipeDetails,
    currentDishIndex, errorRecipe, loadingCook, isNavBarVisible,
    shuffledMessages: shuffledMessagesRef.current,
    
    setServings, setBudget, setEnableBudget, setStrictMode, setCurrentDishIndex,
    handleGenerate, handleSelectMenu, handleConfirmCook, handleAddToShoppingList, closeRecipeModal,
  };
};
