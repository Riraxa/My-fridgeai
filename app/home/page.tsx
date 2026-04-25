//app/home/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { Plus, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useFridge } from "@/app/components/FridgeProvider";
import { useTheme } from "@/app/components/ThemeProvider";
import IngredientList from "@/app/components/IngredientList";
import Toast from "@/app/components/Toast";
import AddEditModal from "@/app/components/AddEditModal";
import ImageRecognitionModal from "@/app/components/ImageRecognitionModal";
import PageTransition, {
  HeaderTransition,
  ContentTransition,
} from "@/app/components/PageTransition";
import { AnimatePresence } from "framer-motion";
import { Ingredient } from "@/types";

import AddActionMenu from "@/app/components/AddActionMenu";
import TodayRecommendation from "./components/TodayRecommendation";
import FloatingAssistant from "@/app/components/FloatingAssistant";

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAddOpen, setAddOpen] = useState(false);
  const [prefilledItem, setPrefilledItem] = useState<Ingredient | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // 画像認識用のステート
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [recognizedItems, setRecognizedItems] = useState<any[] | null>(null);

  const {
    items,
    toast,
    setToast,
    addOrUpdateItem,
  } = useFridge();

  useEffect(() => {
    setMounted(true);
  }, []);

  // 初回のみオンボーディングへ（完了後はスキップ）
  useEffect(() => {
    if (!mounted) return;
    if (status !== "authenticated") return;
    
    const checkOnboardingStatus = async () => {
      try {
        const response = await fetch("/api/user/onboarding-status");
        if (response.ok) {
          const data = await response.json();
          if (!data.onboardingCompleted) {
            router.replace("/onboarding");
            return;
          }
        }
      } catch (error) {
        console.error("Failed to check onboarding status:", error);
        // エラー時はonboardingをスキップしてホームを表示
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [mounted, status, router]);

  useEffect(() => {
    if (mounted) {
      if (status === "loading") {
        return;
      }

      if (status === "unauthenticated") {
        router.push("/login");
        return;
      }
    }
  }, [status, mounted, session, router]);

  useEffect(() => {
    const openAdd = (e: any) => {
      setPrefilledItem(e.detail || null);
      setAddOpen(true);
    };
    window.addEventListener("fridge_open_add", openAdd);
    return () => window.removeEventListener("fridge_open_add", openAdd);
  }, []);

  // 統計情報の計算 - useCallbackで最適化
  const stats = useMemo(() => {
    if (!items || items.length === 0) return { total: 0, expiring: 0 };

    let expiring = 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0); // 今日の開始時刻に設定
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999); // 3日後の終了時刻に設定

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      const dateStr = item.expirationDate;
      if (dateStr) {
        const itemDate = new Date(dateStr);
        // タイムゾーンを考慮して日付比較
        const itemDateOnly = new Date(
          itemDate.getFullYear(),
          itemDate.getMonth(),
          itemDate.getDate(),
        );

        if (itemDateOnly >= now && itemDateOnly <= threeDaysFromNow) {
          expiring++;
        }
      }
    }

    return { total: items.length, expiring };
  }, [items]);

  // 検索フィルタリング - パフォーマンス最適化
  const filteredItems = useMemo(() => {
    if (!items) return [];

    const query = searchQuery.toLowerCase().trim();

    return items.filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.category && item.category.toLowerCase().includes(query));

      const matchesCategory =
        selectedCategory === "すべて" || item.category === selectedCategory;

      return matchesQuery && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  const handleSaveIngredient = async (it: Ingredient) => {
    setIsAdding(true);
    try {
      await addOrUpdateItem(it);
      setAddOpen(false);
      setPrefilledItem(null);
    } finally {
      setIsAdding(false);
    }
  };

  const handleImageSelected = async (file: File) => {
    setIsAnalyzingImage(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/ingredients/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      if (!res.ok) {
        throw new Error("AI Agent Connection Failed");
      }

      const data = await res.json();
      setRecognizedItems(data.result?.ingredients || []);
    } catch (err) {
      console.error(err);
      setToast("画像の解析に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleSaveBatch = async (itemsToSave: any[]) => {
    setIsAdding(true);
    try {
      for (const item of itemsToSave) {
        await addOrUpdateItem({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          expirationDate: item.computedExpirationDate,
        });
      }
      setRecognizedItems(null);
      setToast(`${itemsToSave.length}件の食材を一括追加しました`);
    } catch (err) {
      setToast("食材の一括追加中にエラーが発生しました");
    } finally {
      setIsAdding(false);
    }
  };

  if (!mounted || status === "loading" || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div
            className="w-8 h-8 rounded-full border-4 border-t-transparent mx-auto"
            style={{
              borderColor: "var(--accent)",
              borderTopColor: "transparent",
              animation: "spin 900ms linear infinite",
            }}
          />
          <p 
            className="text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            読み込み中...
          </p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <PageTransition className="container mx-auto min-h-screen pb-32">
      <HeaderTransition className="sticky top-0 z-40 flex items-center justify-center border-b border-[var(--surface-border)] bg-[var(--background)]/95 px-4 py-3">
        <div className="relative w-32 h-8">
          <Image 
            src={theme === "dark" ? "/my-fridgeai-logo-dark.png" : "/my-fridgeai-logo-light.png"} 
            alt="My-fridgeai" 
            width={128}
            height={32}
            className="object-contain"
            priority
          />
        </div>
      </HeaderTransition>

      <ContentTransition className="p-4 space-y-6">
        {/* Today's Recommendation */}
        <TodayRecommendation />

        {/* Action Buttons and Summary */}
        <section className="flex justify-between items-start gap-4">
          {/* Summary Cards */}
          <div className="flex gap-2">
            <div
              className="p-2 rounded-lg transition flex flex-row items-center justify-between"
              style={{
                background: "var(--surface-bg)",
                border: "1px solid var(--surface-border)",
                width: "120px",
              }}
            >
              <div
                className="text-sm font-medium"
                style={{ color: "var(--color-text-muted)" }}
              >
                在庫数
              </div>
              <div
                className="text-xl font-bold"
                style={{ color: "var(--accent)" }}
              >
                {stats.total}
              </div>
            </div>
            <div
              className="p-2 rounded-lg transition flex flex-row items-center justify-between"
              style={{
                background: "var(--surface-bg)",
                border: "1px solid var(--surface-border)",
                width: "120px",
              }}
            >
              <div
                className="text-sm font-medium"
                style={{ color: "var(--color-text-muted)" }}
              >
                期限間近
              </div>
              <div className="text-xl font-bold" style={{ color: "#f59e0b" }}>
                {stats.expiring}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
        </section>

        <div className="h-4" /> {/* Gap after summary */}

        {/* Search */}
        <section className="relative mt-6">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="在庫を検索..."
            className="w-full rounded-2xl pl-11 pr-5 py-3 text-sm focus:outline-none transition"
            style={{
              background: "var(--surface-bg)",
              border: "1px solid var(--surface-border)",
              color: "var(--color-text-primary)",
            }}
          />
        </section>

        {/* Category Filters */}
        <section className="mt-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 justify-center min-w-max px-4">
            {["すべて", "冷蔵", "冷凍", "野菜", "調味料", "加工食品", "その他"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition ${selectedCategory === cat
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "bg-[var(--surface-bg)] text-[var(--color-text-secondary)] border border-[var(--surface-border)]"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Ingredient List */}
        <section className="mt-6">
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="font-bold text-sm">在庫リスト</h2>
            {isAdding && (
              <div
                className="text-xs font-medium flex items-center gap-1"
                style={{ color: "var(--accent)" }}
              >
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                追加中...
              </div>
            )}
          </div>
          <div className="card border border-[var(--surface-border)]">
            {mounted ? (
              <IngredientList
                searchQuery={searchQuery}
                filteredItems={filteredItems}
              />
            ) : (
              <div className="text-[var(--color-text-muted)] text-center py-8">
                読み込み中...
              </div>
            )}
          </div>
        </section>
      </ContentTransition>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
          >
            <div className="w-full max-w-sm card p-6 shadow-2xl rounded-[2rem]">
              <AddEditModal
                item={prefilledItem}
                onSave={handleSaveIngredient}
                onCancel={() => {
                  setAddOpen(false);
                  setPrefilledItem(null);
                }}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Analysis Loading Overlay */}
      {isAnalyzingImage && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center backdrop-blur-sm p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}>
          <div className="w-12 h-12 rounded-full border-4 border-t-transparent mb-4" style={{ borderColor: "var(--accent)", borderTopColor: "transparent", animation: "spin 900ms linear infinite" }} />
          <p className="text-white font-bold text-lg">画像を解析しています...</p>
          <p className="text-white/80 text-sm mt-2">食材名や賞味期限を推定中です</p>
        </div>
      )}

      {/* Image Recognition Detail / Edit Modal */}
      <AnimatePresence>
        {recognizedItems !== null && (
          <div
            className="fixed inset-0 z-[55] flex flex-col items-center justify-end md:justify-center backdrop-blur-sm p-0 md:p-4"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
          >
            <div className="w-full h-[90vh] md:h-[80vh] md:max-h-[800px] md:max-w-xl md:rounded-[2rem] rounded-t-[2rem] bg-[var(--background)] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full md:slide-in-from-bottom-8">
              <ImageRecognitionModal
                initialItems={recognizedItems}
                onSaveBatch={handleSaveBatch}
                onCancel={() => setRecognizedItems(null)}
                isSaving={isAdding}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      <AddActionMenu
        onManualAdd={() => setAddOpen(true)}
        onImageSelected={handleImageSelected}
        hidden={isAddOpen || recognizedItems !== null}
      />

      <FloatingAssistant />

      <Toast msg={toast} onClose={() => setToast(null)} />
    </PageTransition>
  );
}
