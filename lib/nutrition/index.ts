// GENERATED_BY_AI: 2026-03-18 cascade
export type {
  DishWithNutrition,
  NutritionEvaluation,
} from "./evaluation";
export { evaluateNutrition, getPFCBalance } from "./evaluation";

export interface NutritionInfo {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  salt: number;
}

export interface FoodNutrition {
  id: string;
  name: string;
  category: string;
  nutrition: NutritionInfo;
}

export interface IngredientWithAmount {
  name: string;
  amount: number;
  unit: string | Unit;
}

export interface Unit {
  id: number;
  name: string;
  description: string;
  step: number;
}

export interface IngredientWithNutrition {
  name: string;
  amount: number;
  unit: Unit;
  nutrition?: NutritionInfo;
}
