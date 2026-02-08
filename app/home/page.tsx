//app/home/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import NotificationModal from "@/app/components/NotificationModal";
import { Plus, Search, Bell, ScanLine } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useFridge } from "@/app/components/FridgeProvider";
import NavBar from "@/app/components/NavBar";
import IngredientList from "@/app/components/IngredientList";
import BarcodeScanner from "@/app/components/BarcodeScanner";
import Toast from "@/app/components/Toast";
import AddEditModal from "@/app/components/AddEditModal";
import PageTransition, {
  HeaderTransition,
  ContentTransition,
} from "@/app/components/PageTransition";
import { AnimatePresence } from "framer-motion";
import { Ingredient } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isAddOpen, setAddOpen] = useState(false);
  const [prefilledItem, setPrefilledItem] = useState<Ingredient | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const {
    items,
    toast,
    setToast,
    addOrUpdateItem,
    barcodeOpen,
    setBarcodeOpen,
  } = useFridge();

  useEffect(() => {
    setMounted(true);
  }, []);

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
      const dateStr = items[i].expirationDate;
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
    if (!items || !searchQuery.trim()) return items || [];

    const query = searchQuery.toLowerCase();
    const result = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (
        item.name.toLowerCase().includes(query) ||
        (item.category && item.category.toLowerCase().includes(query))
      ) {
        result.push(item);
      }
    }

    return result;
  }, [items, searchQuery]);

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

  if (!mounted || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        読み込み中…
      </div>
    );
  }

  if (!session) return null;

  return (
    <PageTransition className="container mx-auto min-h-screen pb-32">
      <HeaderTransition className="sticky top-0 z-40 flex items-center justify-center border-b border-[var(--surface-border)] bg-[var(--background)]/95 px-4 py-3">
        <div className="text-lg font-bold">My-fridgeai</div>
      </HeaderTransition>

      <ContentTransition className="p-4 space-y-6">
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
            <button
              onClick={() => setBarcodeOpen(true)}
              className="p-2 rounded-full transition"
              style={{
                background: "var(--surface-bg)",
                border: "1px solid var(--surface-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              <ScanLine size={20} />
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="rounded-full p-2 shadow-lg"
              style={{
                background: "var(--accent)",
                color: "#fff",
              }}
            >
              <Plus size={20} />
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

      <AnimatePresence>
        {isNotificationsOpen && (
          <NotificationModal onClose={() => setIsNotificationsOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {barcodeOpen && (
          <div>
            <BarcodeScanner
              visible={barcodeOpen}
              onClose={() => setBarcodeOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>

      <NavBar />
      <Toast msg={toast} onClose={() => setToast(null)} />
    </PageTransition>
  );
}
