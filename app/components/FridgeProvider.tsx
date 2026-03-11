//app/components/FridgeProvider.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { Ingredient } from "@/types";

type Item = Ingredient & { id: string };

type Usage = { date: string; count: number; premium: boolean };

export type FridgeContextType = {
  items: Item[]; // never null for consumers (empty array when none)
  setItems: (v: Item[]) => void;
  addOrUpdateItem: (
    it: Partial<Item> & { id?: string },
  ) => Promise<Item | null>;
  deleteItem: (id: string) => Promise<boolean>;
  savedMenus: any[];
  setSavedMenus: (s: any[]) => void;
  favoriteTitles: string[];
  setFavoriteTitles: (s: string[]) => void;
  usage: Usage;
  setUsage: (u: Usage) => void;
  toast: string | null;
  setToast: (m: string | null) => void;
  shopping: any[];
  setShopping: React.Dispatch<React.SetStateAction<any[]>>;
  receiptScanOpen: boolean;
  setReceiptScanOpen: (v: boolean) => void;
  deletingIds: Set<string>;
  setDeletingIds: (ids: Set<string>) => void;
  recognizedLabels: string[];
  setRecognizedLabels: (v: string[]) => void;
  openReceiptScan: () => void;
  openAddModal: (detail?: any) => void; // <-- detail optional
  fetchIngredients: () => Promise<void>;
  isLoading: boolean;
  isNavBarVisible: boolean;
  setIsNavBarVisible: (v: boolean) => void;
};

const FridgeContext = createContext<FridgeContextType | undefined>(undefined);

/* ---------- Utilities ---------- */
const safeParse = <T,>(s: string | null, fallback: T): T => {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};

const isClient = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const LS = {
  items: "fridge.items",
  savedMenus: "fridge.savedMenus",
  favorites: "fridge.favorites",
  usage: "fridge.usage",
  shopping: "fridge.shopping",
  recognized: "fridge.recognized",
};

/* ---------- Provider component ---------- */
export function FridgeProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const todayISO = useCallback(() => new Date().toISOString().slice(0, 10), []);

  const initItems = useCallback((): Item[] => {
    if (!isClient()) return [];
    return safeParse<Item[]>(localStorage.getItem(LS.items), []);
  }, []);

  const initSavedMenus = useCallback(() => {
    if (!isClient()) return [];
    return safeParse<any[]>(localStorage.getItem(LS.savedMenus), []);
  }, []);

  const initFavorites = useCallback(() => {
    if (!isClient()) return [];
    return safeParse<string[]>(localStorage.getItem(LS.favorites), []);
  }, []);

  const initUsage = useCallback((): Usage => {
    if (!isClient()) return { date: todayISO(), count: 0, premium: false };
    return safeParse<Usage>(localStorage.getItem(LS.usage), {
      date: todayISO(),
      count: 0,
      premium: false,
    });
  }, [todayISO]);

  const initShopping = useCallback(() => {
    if (!isClient()) return [];
    return safeParse<any[]>(localStorage.getItem(LS.shopping), []);
  }, []);

  const initRecognized = useCallback(() => {
    if (!isClient()) return [];
    return safeParse<string[]>(localStorage.getItem(LS.recognized), []);
  }, []);

  // states
  const [items, setItems] = useState<Item[]>(() => initItems());
  const [savedMenus, setSavedMenus] = useState<any[]>(() => initSavedMenus());
  const [favoriteTitles, setFavoriteTitles] = useState<string[]>(() =>
    initFavorites(),
  );
  const [usage, setUsage] = useState<Usage>(() => initUsage());
  const [toast, setToast] = useState<string | null>(null);
  const [shopping, setShopping] = useState<any[]>(() => initShopping());
  const [recognizedLabels, setRecognizedLabels] = useState<string[]>(() =>
    initRecognized(),
  );
  const [receiptScanOpen, setReceiptScanOpen] = useState<boolean>(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNavBarVisible, setIsNavBarVisible] = useState<boolean>(true);

  // persist to localStorage when these change (client-only)
  useEffect(() => {
    if (!isClient()) return;
    try {
      localStorage.setItem(LS.items, JSON.stringify(items ?? []));
    } catch { }
  }, [items]);

  useEffect(() => {
    if (!isClient()) return;
    try {
      localStorage.setItem(LS.savedMenus, JSON.stringify(savedMenus));
    } catch { }
  }, [savedMenus]);

  useEffect(() => {
    if (!isClient()) return;
    try {
      localStorage.setItem(LS.favorites, JSON.stringify(favoriteTitles));
    } catch { }
  }, [favoriteTitles]);

  useEffect(() => {
    if (!isClient()) return;
    try {
      localStorage.setItem(LS.usage, JSON.stringify(usage));
    } catch { }
  }, [usage]);

  useEffect(() => {
    if (!isClient()) return;
    try {
      localStorage.setItem(LS.shopping, JSON.stringify(shopping));
    } catch { }
  }, [shopping]);

  useEffect(() => {
    if (!isClient()) return;
    try {
      localStorage.setItem(LS.recognized, JSON.stringify(recognizedLabels));
    } catch { }
  }, [recognizedLabels]);

  // toast auto clear
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- Server sync: fetchIngredients ---------- */
  const fetchIngredients = useCallback(async () => {
    if (!isClient()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/ingredients", { credentials: "include" });
      if (!res.ok) {
        console.debug("fetchIngredients: server returned non-ok", res.status);
        setIsLoading(false);
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.items && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch (e) {
      console.debug("fetchIngredients fallback to localStorage", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // try fetch once on mount or when session status changes
  useEffect(() => {
    if (status === "authenticated") {
      fetchIngredients();
    } else if (status === "unauthenticated") {
      setIsLoading(false);
    }
  }, [status, fetchIngredients]);

  /* ---------- addOrUpdateItem ---------- */
  const addOrUpdateItem = useCallback(
    async (it: Partial<Item> & { id?: string }): Promise<Item | null> => {
      const name = String(it.name ?? "").trim();
      if (!name) {
        console.warn("addOrUpdateItem: empty name, ignoring");
        return null;
      }
      const quantity =
        typeof it.quantity === "number"
          ? it.quantity
          : it.quantity
            ? Number(it.quantity)
            : 1;
      const unit = it.unit ?? "個";
      const expirationDate = it.expirationDate
        ? new Date(it.expirationDate).toISOString()
        : null;
      const category = it.category ?? "その他";

      const isUpdate = typeof it.id === "string" && it.id.length > 0;

      const withId: Item = isUpdate
        ? { ...(it as Item) }
        : ({
          id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
          name,
          quantity,
          amount: it.amount ?? quantity,
          amountLevel: it.amountLevel ?? null,
          unit,
          expirationDate,
          category,
        } as Item);

      try {
        const method = isUpdate ? "PUT" : "POST";
        const url = isUpdate
          ? `/api/ingredients/${encodeURIComponent(withId.id)}`
          : "/api/ingredients";
        const payload = isUpdate
          ? { ...it }
          : {
            name,
            quantity,
            amount: it.amount ?? quantity,
            amountLevel: it.amountLevel ?? null,
            unit,
            expirationDate,
            category,
            ingredientType: it.ingredientType ?? "raw",
            productId: it.productId ?? null,
          };
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          const serverItem = data?.item ?? withId;
          setItems((prev) => {
            const curr = prev ?? [];
            const idx = curr.findIndex((p) => p.id === serverItem.id);
            if (idx >= 0) {
              const next = [...curr];
              next[idx] = { ...next[idx], ...serverItem };
              return next;
            }
            return [serverItem, ...curr];
          });
          setToast("食材を保存しました");
          return serverItem;
        } else {
          const txt = await res.text().catch(() => "");
          console.warn("addOrUpdateItem: server non-ok", res.status, txt);
        }
      } catch (err) {
        console.debug(
          "addOrUpdateItem: server unavailable - fallback to local",
          err,
        );
      }

      // local fallback
      setItems((prev) => {
        const curr = prev ?? [];
        if (isUpdate) {
          const idx = curr.findIndex((p) => p.id === withId.id);
          if (idx >= 0) {
            const next = [...curr];
            next[idx] = { ...next[idx], ...withId };
            setToast("食材を更新しました");
            return next;
          }
          setToast("食材を追加しました");
          return [withId, ...curr];
        } else {
          setToast("食材を追加しました");
          return [withId, ...curr];
        }
      });

      return withId;
    },
    [],
  );

  /* ---------- deleteItem ---------- */
  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    if (!id) return false;

    // 削除中の状態を追加
    setDeletingIds((prev) => new Set(prev).add(id));

    try {
      const res = await fetch(`/api/ingredients/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setItems((prev) => (prev ?? []).filter((p) => p.id !== id));
        setToast("食材を削除しました");
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return true;
      } else {
        console.warn("deleteItem: server non-ok", res.status);
      }
    } catch (err) {
      console.debug("deleteItem: server unavailable - fallback", err);
    }

    // ローカルフォールバック
    setItems((prev) => (prev ?? []).filter((p) => p.id !== id));
    setToast("食材を削除しました");
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    return true;
  }, []);

  /* ---------- global helpers / events ---------- */
  useEffect(() => {
    const openReceiptScan = () => setReceiptScanOpen(true);
    const openAddModalEvent = (detail?: any) =>
      window.dispatchEvent(new CustomEvent("fridge_open_add", { detail }));
    (window as any).__fridge_open_receipt_scan = openReceiptScan;
    (window as any).__fridge_open_add = openAddModalEvent;
    return () => {
      delete (window as any).__fridge_open_receipt_scan;
      delete (window as any).__fridge_open_add;
    };
  }, []);

  const openReceiptScan = useCallback(() => setReceiptScanOpen(true), []);
  // openAddModal now accepts optional detail (for prefill)
  const openAddModal = useCallback((detail?: any) => {
    try {
      window.dispatchEvent(new CustomEvent("fridge_open_add", { detail }));
      // also set the compat function
      (window as any).__fridge_open_add?.(detail);
    } catch (_e) {
      // fallback: dispatch simple event
      try {
        window.dispatchEvent(new CustomEvent("fridge_open_add"));
      } catch { }
    }
  }, []);

  /* ---------- context value ---------- */
  const value = useMemo<FridgeContextType>(
    () => ({
      items,
      setItems,
      addOrUpdateItem,
      deleteItem,
      savedMenus,
      setSavedMenus,
      favoriteTitles,
      setFavoriteTitles,
      usage,
      setUsage,
      toast,
      setToast,
      shopping,
      setShopping,
      receiptScanOpen,
      setReceiptScanOpen,
      deletingIds,
      setDeletingIds,
      recognizedLabels,
      setRecognizedLabels,
      openReceiptScan,
      openAddModal,
      fetchIngredients,
      isLoading,
      isNavBarVisible,
      setIsNavBarVisible,
    }),
    [
      items,
      setItems,
      addOrUpdateItem,
      deleteItem,
      savedMenus,
      setSavedMenus,
      favoriteTitles,
      setFavoriteTitles,
      usage,
      setUsage,
      toast,
      setToast,
      shopping,
      setShopping,
      receiptScanOpen,
      setReceiptScanOpen,
      deletingIds,
      setDeletingIds,
      recognizedLabels,
      setRecognizedLabels,
      openReceiptScan,
      openAddModal,
      fetchIngredients,
      isLoading,
      isNavBarVisible,
      setIsNavBarVisible,
    ],
  );

  return (
    <FridgeContext.Provider value={value}>{children}</FridgeContext.Provider>
  );
}

/* ---------- useFridge hook (named export) ---------- */
export function useFridge(): FridgeContextType {
  const ctx = useContext(FridgeContext);
  if (!ctx) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "useFridge() called without FridgeProvider. Wrap your app with <FridgeProvider>.",
      );
    }
    return {
      items: [],
      setItems: () => { },
      addOrUpdateItem: async () => null,
      deleteItem: async () => false,
      savedMenus: [],
      setSavedMenus: () => { },
      favoriteTitles: [],
      setFavoriteTitles: () => { },
      usage: {
        date: new Date().toISOString().slice(0, 10),
        count: 0,
        premium: false,
      },
      setUsage: () => { },
      toast: null,
      setToast: () => { },
      shopping: [],
      setShopping: () => { },
      receiptScanOpen: false,
      setReceiptScanOpen: () => { },
      deletingIds: new Set(),
      setDeletingIds: () => { },
      recognizedLabels: [],
      setRecognizedLabels: () => { },
      openReceiptScan: () => { },
      openAddModal: () => { }, // default no-op
      fetchIngredients: async () => { },
      isLoading: false,
      isNavBarVisible: true,
      setIsNavBarVisible: () => { },
    };
  }
  return ctx;
}

/* ---------- default export ---------- */
export default FridgeProvider;
