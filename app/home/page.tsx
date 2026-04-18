//app/home/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import NotificationModal from "@/app/components/NotificationModal";
import { Plus, Search, Bell, ChefHat, Leaf, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useFridge } from "@/app/components/FridgeProvider";
import { useTheme } from "@/app/components/ThemeProvider";
import IngredientList from "@/app/components/IngredientList";
import ReceiptScanner from "@/app/components/ReceiptScanner";
import Toast from "@/app/components/Toast";
import AddEditModal from "@/app/components/AddEditModal";
import PageTransition, {
  HeaderTransition,
  ContentTransition,
} from "@/app/components/PageTransition";
import { AnimatePresence } from "framer-motion";
import { Ingredient } from "@/types";
import BarcodeScanner from "@/app/components/BarcodeScanner";

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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [pendingScannedItems, setPendingScannedItems] = useState<any[]>([]);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  const {
    items,
    toast,
    setToast,
    addOrUpdateItem,
    receiptScanOpen,
    setReceiptScanOpen,
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

  // 賞味期限チェックと通知作成
  useEffect(() => {
    if (session?.user?.id && items) {
      const checkExpiringItems = async () => {
        try {
          await fetch("/api/notifications/check-expiring", {
            method: "POST",
          });
        } catch (error) {
          console.error("Failed to check expiring items:", error);
        }
      };

      checkExpiringItems();
    }
  }, [session?.user?.id, items]);

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

      // Check for more pending scanned items
      if (pendingScannedItems.length > 0) {
        const nextItems = [...pendingScannedItems];
        const nextItem = nextItems.shift();
        setPendingScannedItems(nextItems);
        if (nextItem) {
          preparePrefilledItem(nextItem);
        }
      }
    } finally {
      setIsAdding(false);
    }
  };

  const preparePrefilledItem = async (productData: any) => {
    setToast("情報を推定中...");
    try {
      // Use the Hybrid Engine to get expiration, category, and quantity
      const resp = await fetch("/api/ingredients/estimate-expiration", {
        method: "POST",
        body: JSON.stringify({ name: productData.name }),
      });
      const estimation = await resp.json();

      // AI推論結果を優先使用、なければAPI推定結果をフォールバック
      const newItem: Partial<Ingredient> = {
        name: productData.name,
        category: productData.category || estimation.estimatedCategory || "冷蔵",
        amount: productData.amount || estimation.estimatedAmount || 1,
        unit: productData.unit || estimation.estimatedUnit || "個",
      };

      // AI推論の賞味期限を優先使用
      if (productData.recommendedExpiry) {
        newItem.expirationDate = new Date(productData.recommendedExpiry).toISOString();
      } else if (estimation.estimatedExpiration) {
        newItem.expirationDate = new Date(estimation.estimatedExpiration).toISOString();
      }

      // If barcode lookup gave us a specific quantity, try to use it
      if (productData.quantity) {
        // e.g. "500ml" or "100g"
        const qtyMatch = productData.quantity.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+)$/);
        if (qtyMatch) {
          newItem.amount = parseFloat(qtyMatch[1]);
          newItem.unit = qtyMatch[2];
        }
      }

      setPrefilledItem(newItem as Ingredient);
      setAddOpen(true);
    } catch (error) {
      console.error("Estimation failed", error);
      setPrefilledItem({
        name: productData.name,
        category: "冷蔵",
        amount: 1,
        unit: "個",
      } as Ingredient);
      setAddOpen(true);
    } finally {
      setToast(null);
    }
  };

  const handleBarcodeResults = (results: any[]) => {
    setIsBarcodeOpen(false);
    // 不明商品（isNotFound）も含めて処理（手動入力可能に）
    if (results.length === 0) return;

    const items = [...results];
    const first = items.shift();
    setPendingScannedItems(items);

    if (first) {
      // 不明商品の場合は空の名前で開く
      if (first.isNotFound) {
        setPrefilledItem({
          name: first.name || "",
          category: "冷蔵",
          amount: 1,
          unit: "個",
          barcode: first.barcode,
        } as Partial<Ingredient> as Ingredient);
        setAddOpen(true);
      } else {
        preparePrefilledItem(first);
      }
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

          {/* Action Buttons: Only notification remains in header */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsNotificationsOpen(true);
                setHasUnreadNotifications(false);
              }}
              className="p-2 rounded-full transition relative"
              style={{
                background: "var(--surface-bg)",
                border: "1px solid var(--surface-border)",
                color: "var(--color-text-secondary)",
              }}
              title="通知"
            >
              <Bell size={20} />
              {(stats.expiring > 0 || hasUnreadNotifications) && (
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
                  style={{
                    background: "#f59e0b",
                    borderColor: "var(--background)",
                  }}
                />
              )}
            </button>
          </div>
        </section>

        {/* --- Quick Actions --- */}
        <section>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => router.push("/menu/generate")}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-bg)] hover:bg-[var(--surface-lighter)] transition-colors gap-2 shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <ChefHat size={20} />
              </div>
              <span className="text-xs font-bold text-[var(--color-text-primary)]">じっくり献立</span>
            </button>

            <button
              onClick={() => router.push("/mode/use-up")}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-bg)] hover:bg-[var(--surface-lighter)] transition-colors gap-2 shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Leaf size={20} />
              </div>
              <span className="text-xs font-bold text-[var(--color-text-primary)]">使い切り優先</span>
            </button>

            <button
              onClick={() => router.push("/mode/quick")}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-bg)] hover:bg-[var(--surface-lighter)] transition-colors gap-2 shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <Zap size={20} />
              </div>
              <span className="text-xs font-bold text-[var(--color-text-primary)]">すぐ作る</span>
            </button>
          </div>
        </section>

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
                  
                  // Even if cancelled, check for more pending scanned items
                  if (pendingScannedItems.length > 0) {
                    const nextItems = [...pendingScannedItems];
                    const nextItem = nextItems.shift();
                    setPendingScannedItems(nextItems);
                    if (nextItem) {
                      setTimeout(() => preparePrefilledItem(nextItem), 100);
                    }
                  }
                }}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNotificationsOpen && (
          <NotificationModal onClose={() => setIsNotificationsOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {receiptScanOpen && (
          <div>
            <ReceiptScanner
              visible={receiptScanOpen}
              onClose={() => setReceiptScanOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBarcodeOpen && (
          <BarcodeScanner
            onResults={handleBarcodeResults}
            onClose={() => setIsBarcodeOpen(false)}
          />
        )}
      </AnimatePresence>

      <AddActionMenu 
        onManualAdd={() => setAddOpen(true)}
        onBarcodeScan={() => setIsBarcodeOpen(true)}
        onReceiptScan={() => setReceiptScanOpen(true)}
        hidden={isAddOpen || receiptScanOpen}
      />

      <FloatingAssistant />

      <Toast msg={toast} onClose={() => setToast(null)} />
    </PageTransition>
  );
}
