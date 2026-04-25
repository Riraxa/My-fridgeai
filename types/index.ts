// GENERATED_BY_AI: 2026-03-18 antigravity
//types/index.ts
export type IngredientType = "raw" | "processed_base" | "instant_complete";

/**
 * 制約モード（Constraint Mode）
 * - strict: 冷蔵庫内の食材 + 暗黙食材のみで献立を生成
 * - flexible: 手持ち食材を優先しつつ、不足食材は2品程度まで追加許可
 * - quick: 短時間で調理可能なメニューを優先
 * - use-up: 賞味期限の近い食材の消費を最優先
 */
export type ConstraintMode = "strict" | "flexible" | "quick" | "use-up";

/**
 * 制約モード付き献立の食材情報
 */
export interface ConstrainedIngredient {
  name: string;
  amount: number;
  unit: string;
  fromStock: boolean;
  isImplicit?: boolean;
}

/**
 * Strict モード失敗時のエラーレスポンス
 */
export interface InsufficientInventoryError {
  error: "INSUFFICIENT_INVENTORY";
  message: string;
}

export interface Ingredient {
  id?: string;
  userId?: string;
  name: string;
  category: string;
  amount: number | null;
  amountLevel: string | null;
  unit: string | null;
  expirationDate: string | Date | null;
  quantity?: number; // Legacy
  ingredientType?: IngredientType;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Dish {
  type: string;
  name: string;
  cookingTime: number;
  difficulty: number;
  ingredients: {
    name: string;
    amount: number;
    unit: string;
  }[];
  steps: string[];
  tips: string;
  nutrition?: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}

export interface GeneratedMenu {
  title: string;
  reason: string;
  tags: string[];
  dishes: Dish[];
}

export interface MenuGeneration {
  id: string;
  userId: string;
  mainMenu: GeneratedMenu;
  alternativeA: GeneratedMenu | null;
  status: string;
  generatedAt: string | Date;
  selectedMenu?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  done: boolean;
  quantity?: string | number;
  unit?: string;
  note?: string;
}

export interface SavedMenu {
  id: string;
  title: string;
  createdAt: string;
  dishes?: Dish[];
}

