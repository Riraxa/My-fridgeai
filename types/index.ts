// GENERATED_BY_AI: 2026-03-18 antigravity
//types/index.ts
export type IngredientType = "raw" | "processed_base" | "instant_complete";

/**
 * 制約モード（Constraint Mode）
 * - strict: 冷蔵庫内の食材 + 暗黙食材のみで献立を生成
 * - flexible: 冷蔵庫内食材を優先しつつ、不足分を一部許可（デフォルト互換）
 */
export type ConstraintMode = "strict" | "flexible";

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

export interface Product {
  id: string;
  userId: string;
  name: string;
  brandName: string | null;
  ingredientType: IngredientType;
  requiresAdditionalIngredients: { name: string; amount: number; unit: string }[];
  instructionTemplate: string | null;
  nutritionEstimate: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  } | null;
  category: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
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
  productId?: string | null;
  product?: Product | null;
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
  alternativeB: GeneratedMenu | null;
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

