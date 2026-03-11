//types/index.ts
export type IngredientType = "raw" | "processed_base" | "instant_complete";

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

