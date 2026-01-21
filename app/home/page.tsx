//app/home/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import InventoryAlert from "@/app/components/inventory-alert";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp, springTransition, buttonTap } from "@/app/components/motion";

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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
    if (mounted && status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, mounted, session, router]);

  useEffect(() => {
    const openAdd = () => setAddOpen(true);
    window.addEventListener("fridge_open_add", openAdd);
    return () => window.removeEventListener("fridge_open_add", openAdd);
  }, []);

  // 統計情報の計算
  const stats = useMemo(() => {
    if (!items) return { total: 0, expiring: 0 };
    const total = items.length;
    const expiring = items.filter((it) => {
      const dateStr = it.expirationDate || it.expiry;
      if (!dateStr) return false;
      const days = Math.ceil(
        (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      return days <= 3 && days >= 0;
    }).length;
    return { total, expiring };
  }, [items]);

  // 検索フィルタリング
  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(query) ||
        (it.category && it.category.toLowerCase().includes(query)),
    );
  }, [items, searchQuery]);

  const handleDetected = useCallback(
    async (code: string) => {
      await addOrUpdateItem({
        name: `バーコード:${code}`,
        quantity: 1,
        unit: "個",
        category: "その他",
      });
      setToast?.("バーコードから食材を追加しました");
      setBarcodeOpen(false);
    },
    [addOrUpdateItem, setToast, setBarcodeOpen],
  );

  const handleSaveIngredient = async (it: any) => {
    setIsAdding(true);
    try {
      await addOrUpdateItem(it);
      setAddOpen(false);
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
    <motion.div
      className="container mx-auto min-h-screen pb-32"
      initial="hidden"
      animate="show"
      variants={fadeInUp}
    >
      <motion.header
        className="sticky top-0 z-40 flex items-center justify-center border-b border-[var(--surface-border)] backdrop-blur-lg bg-[var(--background)]/70 px-4 py-3"
        variants={fadeInUp}
      >
        <div className="text-lg font-bold">My-fridgeai</div>
      </motion.header>

      <main className="p-4 space-y-6">
        {/* Action Buttons */}
        <section className="flex justify-end gap-2">
          <motion.button
            onClick={() => setIsNotificationsOpen(true)}
            className="p-2 rounded-full transition relative"
            style={{
              background: "var(--surface-bg)",
              border: "1px solid var(--surface-border)",
              color: "var(--color-text-secondary)",
            }}
            whileTap={buttonTap.whileTap}
          >
            <Bell size={20} />
            {stats.expiring > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
                style={{
                  background: "#f59e0b",
                  borderColor: "var(--background)",
                }}
              />
            )}
          </motion.button>
          <motion.button
            onClick={() => setBarcodeOpen(true)}
            className="p-2 rounded-full transition"
            style={{
              background: "var(--surface-bg)",
              border: "1px solid var(--surface-border)",
              color: "var(--color-text-secondary)",
            }}
            whileTap={buttonTap.whileTap}
          >
            <ScanLine size={20} />
          </motion.button>
          <motion.button
            onClick={() => setAddOpen(true)}
            className="rounded-full p-2 shadow-lg"
            style={{
              background: "var(--accent)",
              color: "#fff",
            }}
            whileTap={buttonTap.whileTap}
            transition={springTransition}
          >
            <Plus size={20} />
          </motion.button>
        </section>

        {/* Alerts */}
        <InventoryAlert />

        {/* Summary Cards */}
        <section className="grid grid-cols-2 gap-3">
          <div className="card p-4 flex flex-col items-center border border-[var(--surface-border)]">
            <div
              className="text-2xl font-black"
              style={{ color: "var(--accent)" }}
            >
              {stats.total}
            </div>
            <div
              className="text-[10px] uppercase tracking-wider font-bold mt-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              在庫数
            </div>
          </div>
          <div className="card p-4 flex flex-col items-center border border-[var(--surface-border)]">
            <div className="text-2xl font-black" style={{ color: "#f59e0b" }}>
              {stats.expiring}
            </div>
            <div
              className="text-[10px] uppercase tracking-wider font-bold mt-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              期限間近
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="relative">
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
        <section>
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                追加中...
              </div>
            )}
          </div>
          <div className="card border border-[var(--surface-border)]">
            <IngredientList
              searchQuery={searchQuery}
              filteredItems={filteredItems}
            />
          </div>
        </section>
      </main>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm card p-6 shadow-2xl rounded-[2rem]"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={springTransition}
            >
              <AddEditModal
                item={null}
                onSave={handleSaveIngredient}
                onCancel={() => setAddOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNotificationsOpen && (
          <NotificationModal onClose={() => setIsNotificationsOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {barcodeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <BarcodeScanner
              visible={barcodeOpen}
              onDetected={handleDetected}
              onClose={() => setBarcodeOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <NavBar />
      <Toast msg={toast} onClose={() => setToast(null)} />
    </motion.div>
  );
}
