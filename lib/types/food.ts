export type FoodCategory = "冷蔵" | "冷凍" | "野菜" | "調味料" | "加工食品" | "その他";

export interface FoodMaster {
  name: string;
  days: number;
  category: FoodCategory;
  defaultAmount?: number;
  defaultUnit?: string;
  aliases?: string[];
}
