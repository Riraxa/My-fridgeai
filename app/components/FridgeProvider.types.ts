import type { Ingredient, SavedMenu, ShoppingItem } from "@/types";
import type React from "react";

export type Item = Ingredient & { id: string };

export type Usage = { date: string; count: number; premium: boolean };

export type FridgeContextType = {
  items: Item[];
  setItems: (v: Item[]) => void;
  addOrUpdateItem: (it: Partial<Item> & { id?: string }) => Promise<Item | null>;
  deleteItem: (id: string) => Promise<boolean>;
  savedMenus: SavedMenu[];
  setSavedMenus: (s: SavedMenu[]) => void;
  favoriteTitles: string[];
  setFavoriteTitles: (s: string[]) => void;
  usage: Usage;
  setUsage: (u: Usage) => void;
  toast: string | null;
  setToast: (m: string | null) => void;
  shopping: ShoppingItem[];
  setShopping: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  receiptScanOpen: boolean;
  setReceiptScanOpen: (v: boolean) => void;
  deletingIds: Set<string>;
  setDeletingIds: (ids: Set<string>) => void;
  recognizedLabels: string[];
  setRecognizedLabels: (v: string[]) => void;
  openReceiptScan: () => void;
  openAddModal: (detail?: unknown) => void;
  fetchIngredients: () => Promise<void>;
  isLoading: boolean;
  isNavBarVisible: boolean;
  setIsNavBarVisible: (v: boolean) => void;
};
