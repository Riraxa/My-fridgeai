export type PreferencesTab = "basic" | "safety" | "ingredients";

export const SUB_TABS: { id: PreferencesTab; label: string }[] = [
  { id: "basic", label: "基本" },
  { id: "safety", label: "安全" },
  { id: "ingredients", label: "基本食材" },
];

export const COOKING_METHODS = ["炒め物", "煮物", "焼き物", "揚げ物", "蒸し物", "和え物"];

export const KITCHEN_EQUIPMENT = [
  "ガスコンロ",
  "IH",
  "電子レンジ",
  "オーブン",
  "圧力鍋",
  "トースター",
  "炊飯器",
];

export const KITCHEN_COOKWARE = [
  "フライパン",
  "鍋",
  "包丁・まな板",
  "ボウル",
  "ざる",
  "菜箸・おたま",
];
