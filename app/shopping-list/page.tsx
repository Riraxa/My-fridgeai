//app/shopping-list/page.tsx
"use client";
import React, { useEffect, useState, useCallback } from "react";
import NavBar from "@/app/components/NavBar";
import ShoppingListItem from "@/app/components/ShoppingListItem";
import { useFridge } from "@/app/components/FridgeProvider";
import Toast from "@/app/components/Toast";
import PageTransition, {
  HeaderTransition,
  ContentTransition,
} from "@/app/components/PageTransition";

export default function ShoppingListPage() {
  const {
    shopping = [],
    setShopping,
    toast,
    setToast,
    openAddModal,
  } = useFridge();

  // --- mount guard to avoid SSR/CSR DOM mismatch ---
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleDone = useCallback(
    (index: number) => {
      const next = [...(shopping || [])];
      next[index] = { ...next[index], done: !next[index].done };
      setShopping(next);

      // when user checks an item (marks done), open add modal prefilled so they can set grams / quantity
      const nowDone = !!next[index].done;
      if (nowDone) {
        const it = next[index];
        // send detail to the add modal (home's + modal should listen to fridge_open_add)
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
    },
    [shopping, setShopping, openAddModal],
  );

  const remove = useCallback(
    (index: number) => {
      if (!confirm("このアイテムを削除しますか？")) return;
      const next = [...(shopping || [])];
      next.splice(index, 1);
      setShopping(next);
      setToast("買い物リストから削除しました");
    },
    [shopping, setShopping, setToast],
  );

  return (
    <PageTransition className="mx-auto min-h-screen w-full max-w-md text-[var(--color-text-primary)] pb-32">
      <HeaderTransition className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--background)]/95 px-4 py-3">
        <div />
        <div className="text-lg font-semibold">買い物リスト</div>
        <div />
      </HeaderTransition>

      <ContentTransition className="p-4 pb-28">
        <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-bg)] shadow-sm p-4">
          {/* ALWAYS render <ul> to keep SSR/CSR DOM shape stable */}
          <ul className="space-y-2">
            {!mounted ? (
              // Client not mounted yet: show same placeholder
              <li
                className="text-[var(--color-text-muted)] text-center py-8"
                aria-live="polite"
                style={{ opacity: 0.85 }}
              >
                買い物リストは空です。
                <br />
                献立から自動生成するか、＋ ボタンで追加してください。
              </li>
            ) : shopping.length === 0 ? (
              // Mounted and actually empty
              <li
                className="text-[var(--color-text-muted)] text-center py-8"
                aria-live="polite"
                style={{ opacity: 0.85 }}
              >
                買い物リストは空です。
                <br />
                献立から自動生成するか、＋ ボタンで追加してください。
              </li>
            ) : (
              // Mounted and we have items: render without staggered animation
              shopping.map((it: any, i: number) => (
                <li key={it?.id ?? `${String(it?.name ?? "item")}-${i}`}>
                  <ShoppingListItem
                    item={it}
                    onToggle={() => toggleDone(i)}
                    onDelete={() => remove(i)}
                  />
                </li>
              ))
            )}
          </ul>
        </div>
      </ContentTransition>

      <NavBar />
      <Toast msg={toast} onClose={() => setToast(null)} />
    </PageTransition>
  );
}
