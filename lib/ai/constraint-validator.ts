// GENERATED_BY_AI: 2026-03-18 antigravity
// lib/ai/constraint-validator.ts
//
// AI生成結果に対する制約バリデーション。
// Strict モードでは、生成された献立が在庫 + 暗黙食材のみで構成されていることを検証する。

import { isImplicitIngredient } from "@/lib/constants/implicit-ingredients";
import type { GeneratedMenu } from "./menu-generator";
import type { Ingredient } from "@prisma/client";

export interface ConstraintViolation {
  dishName: string;
  ingredientName: string;
  reason: "not_in_stock" | "insufficient";
}

export interface ConstraintValidationResult {
  isValid: boolean;
  violations: ConstraintViolation[];
}

/**
 * Strict モードの制約バリデーション
 * 生成された献立の全食材が在庫 or 暗黙食材に含まれるかチェックする。
 * @param menu - 検証する献立
 * @param userInventory - ユーザーの在庫
 * @param customImplicitIngredients - カスタム暗黙食材（オプション）
 */
export function validateStrictConstraints(
  menu: GeneratedMenu,
  userInventory: Ingredient[],
  customImplicitIngredients?: string[],
): ConstraintValidationResult {
  const violations: ConstraintViolation[] = [];

  if (!menu?.dishes) {
    return { isValid: true, violations: [] };
  }

  // ユーザーの在庫食材名を正規化してセットにまとめる
  const inventoryNames = new Set(
    userInventory
      .map((i) => i.name?.toLowerCase().trim())
      .filter((n): n is string => typeof n === "string" && n.length > 0),
  );

  for (const dish of menu.dishes) {
    if (!dish.ingredients) continue;

    for (const ingredient of dish.ingredients) {
      const name = ingredient.name?.toLowerCase().trim();
      if (!name) continue;

      // 1. 暗黙食材なら OK
      if (isImplicitIngredient(ingredient.name, customImplicitIngredients)) {
        continue;
      }

      // 2. 在庫に存在するかチェック (部分一致ロジック - inventory.ts と同等)
      const inStock = [...inventoryNames].some((stockName) => {
        return (
          stockName === name ||
          stockName.startsWith(name) ||
          name.startsWith(stockName)
        );
      });

      if (!inStock) {
        violations.push({
          dishName: dish.name,
          ingredientName: ingredient.name,
          reason: "not_in_stock",
        });
      }
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * 3つの献立すべてに対して Strict 制約バリデーションを実行
 * @param menus - 検証する3つの献立
 * @param userInventory - ユーザーの在庫
 * @param customImplicitIngredients - カスタム暗黙食材（オプション）
 */
export function validateAllMenusStrict(
  menus: { main: GeneratedMenu; alternativeA: GeneratedMenu; alternativeB: GeneratedMenu },
  userInventory: Ingredient[],
  customImplicitIngredients?: string[],
): {
  allValid: boolean;
  results: {
    main: ConstraintValidationResult;
    alternativeA: ConstraintValidationResult;
    alternativeB: ConstraintValidationResult;
  };
} {
  const mainResult = validateStrictConstraints(menus.main, userInventory, customImplicitIngredients);
  const altAResult = validateStrictConstraints(menus.alternativeA, userInventory, customImplicitIngredients);
  const altBResult = validateStrictConstraints(menus.alternativeB, userInventory, customImplicitIngredients);

  return {
    allValid: mainResult.isValid && altAResult.isValid && altBResult.isValid,
    results: {
      main: mainResult,
      alternativeA: altAResult,
      alternativeB: altBResult,
    },
  };
}
