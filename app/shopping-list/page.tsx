//app/shopping-list/page.tsx
"use client";
import React, { useEffect, useState, useCallback } from "react";
import ShoppingListItem from "@/app/components/ShoppingListItem";
import { useFridge } from "@/app/components/FridgeProvider";
import Toast from "@/app/components/Toast";
import PageTransition, {
  HeaderTransition,
  ContentTransition,
} from "@/app/components/PageTransition";
import { Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import AddShoppingItemModal from "@/app/components/AddShoppingItemModal";
import { ShoppingItem } from "@/types";

export default function ShoppingListPage() {
  const {
    shopping = [],
    setShopping,
    toast,
    setToast,
    openAddModal,
  } = useFridge();

  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sort shopping list: undone items first
  const sortedShopping = React.useMemo(() => {
    return [...(shopping || [])].sort((a, b) => {
      if (a.done === b.done) return 0;
      return a.done ? 1 : -1;
    });
  }, [shopping]);

  const toggleDone = useCallback(
    (id: string) => {
      setShopping((prev) => {
        const next = [...(prev || [])];
        const idx = next.findIndex((item) => item.id === id);
        if (idx === -1) return prev;

        next[idx] = { ...next[idx], done: !next[idx].done };

        const nowDone = !!next[idx].done;
        if (nowDone) {
          const it = next[idx];
          openAddModal?.({
            mode: "prefill-from-shopping",
            item: {
              id: it.id,
              name: it.name,
              quantity: it.quantity,
              unit: it.unit,
              note: it.note,
            },
          });
        }
        return next;
      });
    },
    [setShopping, openAddModal],
  );

  const handleSave = (item: ShoppingItem) => {
    const next = [...(shopping || [])];
    const idx = next.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      next[idx] = item;
      setToast("更新しました");
    } else {
      next.unshift(item);
      setToast("追加しました");
    }
    setShopping(next);
    setModalOpen(false);
    setEditingItem(null);
  };

  const remove = useCallback(
    (id: string) => {
      if (!confirm("このアイテムを削除しますか？")) return;
      setShopping((prev) => (prev || []).filter((item) => item.id !== id));
      setToast("削除しました");
    },
    [setShopping, setToast],
  );

  const clearDone = () => {
    if (!confirm("完了済みのアイテムをすべて削除しますか？")) return;
    const next = (shopping || []).filter((item) => !item.done);
    setShopping(next);
    setToast("完了済みアイテムを削除しました");
  };

  return (
    <PageTransition className="mx-auto min-h-screen w-full max-w-md text-[var(--color-text-primary)] pb-32">
      <HeaderTransition className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--background)]/95 px-4 py-3">
        <div className="w-10" />
        <div className="text-lg font-semibold text-center">買い物リスト</div>
        <div className="w-10 flex justify-end">
          {shopping.some((it) => it.done) && (
            <button
              onClick={clearDone}
              className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="完了済みを削除"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </HeaderTransition>

      <ContentTransition className="p-4 pb-28">
        {/* Action Buttons */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              setEditingItem(null);
              setModalOpen(true);
            }}
            className="rounded-full p-2 shadow-lg"
            style={{
              background: "var(--accent)",
              color: "#fff",
            }}
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <ul className="space-y-3">
            {!mounted || shopping.length === 0 ? (
              <li
                className="text-[var(--color-text-muted)] text-center py-12 bg-[var(--surface-bg)] rounded-3xl border border-dashed border-[var(--surface-border)]"
                aria-live="polite"
              >
                <div className="mb-2 opacity-20 flex justify-center">
                  <Plus size={48} />
                </div>
                買い物リストは空です。
                <br />
                <span className="text-sm">
                  献立から自動生成するか、＋から追加してください。
                </span>
              </li>
            ) : (
              sortedShopping.map((it: any) => (
                <li key={it.id}>
                  <ShoppingListItem
                    item={it}
                    onToggle={() => toggleDone(it.id)}
                    onDelete={() => remove(it.id)}
                    onEdit={(item) => {
                      setEditingItem(item);
                      setModalOpen(true);
                    }}
                  />
                </li>
              ))
            )}
          </ul>
        </div>
      </ContentTransition>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm p-4"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-sm bg-[var(--background)] p-6 shadow-2xl rounded-[2rem]"
            >
              <AddShoppingItemModal
                item={editingItem}
                onSave={handleSave}
                onCancel={() => {
                  setModalOpen(false);
                  setEditingItem(null);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toast msg={toast} onClose={() => setToast(null)} />
    </PageTransition>
  );
}
