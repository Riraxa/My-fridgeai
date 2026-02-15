//lib/inventory.ts
import { Ingredient } from "@prisma/client";

export interface RequiredIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface IngredientMatch {
  name: string;
  required: { amount: number; unit: string };
  inStock?: { amount: number | string; unit: string }; // amount can be number or string (level)
  shortage?: { amount: number; unit: string };
  status: "available" | "insufficient" | "missing";
}

export interface IngredientAvailability {
  available: IngredientMatch[];
  insufficient: IngredientMatch[];
  missing: IngredientMatch[];
}

export interface UsedIngredient {
  name: string;
  amount: number;
  unit: string;
}

/**
 * Normalize amount to a base unit for comparison
 */
export function normalizeAmount(amount: number, unit: string): number {
  if (!unit || typeof unit !== "string") return amount;

  const normalizedUnit = unit.toLowerCase();

  const unitMap: Record<string, number> = {
    kg: 1000,
    g: 1,
    gram: 1,
    l: 1000,
    L: 1000,
    ml: 1,
    ML: 1,
    cc: 1,
    liter: 1000,
    大さじ: 15,
    tbsp: 15,
    小さじ: 5,
    tsp: 5,
    カップ: 200,
    cup: 200,
    個: 1, // "個" is standard for some but ambiguous. Treat as 1.
    piece: 1,
    slice: 1,

    // 拡張単位変換 (全て g/ml 換算の目安)
    丁: 350,   // 豆腐 1丁 ≈ 300-400g
    cho: 350,
    束: 200,   // ほうれん草など 1束 ≈ 200g
    bunch: 200,
    袋: 100,   // きのこ、カット野菜など 1袋 ≈ 100g (かなり変動ありだが目安として)
    bag: 100,
    合: 150,   // 米 1合 = 150g
    go: 150,
    升: 1500,  // 米 1升 = 1.5kg
    sho: 1500,
    パック: 200, // 肉・魚 1パック (小) ≈ 200g と仮定
    pack: 200,
    本: 150,   // 人参・大根など。変動大きいが目安。
    玉: 200,   // 玉ねぎ1個など。キャベツだと1kgだが... AIがg提案するため補助的。
  };

  const factor = unitMap[normalizedUnit];
  return amount * (factor ?? 1);
}

/**
 * Check if the user has enough ingredients for a recipe.
 */
export function checkIngredientAvailability(
  requiredIngredients: RequiredIngredient[],
  userInventory: Ingredient[],
): IngredientAvailability {
  const available: IngredientMatch[] = [];
  const insufficient: IngredientMatch[] = [];
  const missing: IngredientMatch[] = [];

  for (const required of requiredIngredients) {
    // Skip if required ingredient is invalid
    if (!required?.name || typeof required.name !== "string") {
      console.warn("[Inventory] Skipping invalid ingredient:", required);
      continue;
    }

    // Find matching ingredient in inventory
    // Stricter matching: Exact match or Prefix match (long enough) to avoid false positives like "鶏肉" matching "鶏ガラスープ" incorrectly if not careful
    // User requested: s === r || s.startsWith(r) || r.startsWith(s)
    const stock = userInventory.find((i) => {
      if (!i.name || typeof i.name !== "string") return false;
      if (!required.name || typeof required.name !== "string") return false;

      const s = i.name.toLowerCase().trim();
      const r = required.name.toLowerCase().trim();
      return s === r || s.startsWith(r) || r.startsWith(s);
    });

    if (!stock) {
      missing.push({
        name: required.name,
        required: { amount: required.amount, unit: required.unit },
        status: "missing",
      });
      continue;
    }

    // Logic for "Specific Amount" management
    if (stock.amount !== null && stock.amount > 0) {
      const stockNormalized = normalizeAmount(stock.amount, stock.unit || "");
      const requiredNormalized = normalizeAmount(
        required.amount,
        required.unit,
      );

      if (stockNormalized >= requiredNormalized) {
        available.push({
          name: required.name,
          required: { amount: required.amount, unit: required.unit },
          inStock: { amount: stock.amount, unit: stock.unit || "" },
          status: "available",
        });
      } else {
        // Convert back to required unit if possible
        let shortageAmount = required.amount; // Default to required amount
        let shortageUnit = required.unit;

        // If units are same, calculate actual shortage
        if (stock.unit?.toLowerCase() === required.unit?.toLowerCase()) {
          shortageAmount = required.amount - stock.amount;
        } else {
          // For different units, we'll show the required amount as shortage
          // This is a simplification - the frontend can handle complex unit display
          shortageAmount = required.amount;
          shortageUnit = required.unit;
        }

        insufficient.push({
          name: required.name,
          required: { amount: required.amount, unit: required.unit },
          inStock: { amount: stock.amount, unit: stock.unit || "" },
          shortage: { amount: shortageAmount, unit: shortageUnit },
          status: "insufficient",
        });
      }
    }
    // Logic for "Rough Amount" (Level) management
    else if (stock.amountLevel) {
      // Levels: "たっぷり" (Plenty) > "普通" (Normal) > "少ない" (Little) > "ほぼない" (Almost empty)
      const level = stock.amountLevel;

      if (level === "たっぷり" || level === "普通") {
        available.push({
          name: required.name,
          required: { amount: required.amount, unit: required.unit },
          inStock: { amount: level, unit: "level" },
          status: "available",
        });
      } else {
        // "少ない" or "ほぼない" -> Treat as insufficient
        insufficient.push({
          name: required.name,
          required: { amount: required.amount, unit: required.unit },
          inStock: { amount: level, unit: "level" },
          status: "insufficient",
        });
      }
    } else {
      // Fallback
      missing.push({
        name: required.name,
        required: { amount: required.amount, unit: required.unit },
        status: "missing",
      });
    }
  }

  return { available, insufficient, missing };
}

/**
 * Calculate new inventory state after usage
 * This function returns data to be used in Prisma updates, doesn't update itself.
 */
export function calculateInventoryUpdates(
  usedIngredients: UsedIngredient[],
  userInventory: Ingredient[],
): { update: { id: string; data: any }[]; delete: { id: string }[] } {
  const updates: { id: string; data: any }[] = [];
  const deletes: { id: string }[] = [];

  for (const used of usedIngredients) {
    if (!used?.name || typeof used.name !== "string") {
      console.warn("[Inventory] Skipping invalid used ingredient:", used);
      continue;
    }

    const stock = userInventory.find((i) => {
      if (!i.name || typeof i.name !== "string") return false;

      const s = i.name.toLowerCase().trim();
      const u = used.name.toLowerCase().trim();
      return s === u || s.startsWith(u) || u.startsWith(s);
    });

    if (!stock) continue;

    if (stock.amount !== null) {
      // Numeric update with normalization
      const stockNormalized = normalizeAmount(stock.amount, stock.unit || "");
      const usedNormalized = normalizeAmount(used.amount, used.unit);

      const newAmountNormalized = stockNormalized - usedNormalized;

      // We need to convert back to stock unit to update DB
      // Ratio = newAmountNormalized / stockNormalized
      // NewStockAmount = stock.amount * Ratio

      let newAmount = 0;
      if (stockNormalized > 0) {
        newAmount = stock.amount * (newAmountNormalized / stockNormalized);
      } else {
        newAmount = -1; // Should be deleted
      }

      if (newAmount <= 0) {
        deletes.push({ id: stock.id });
      } else {
        updates.push({
          id: stock.id,
          data: { amount: newAmount },
        });
      }
    } else if (stock.amountLevel) {
      // Level update
      const currentLevel = stock.amountLevel;
      const newLevel = decreaseAmountLevel(currentLevel);

      if (newLevel === "なし") {
        deletes.push({ id: stock.id });
      } else {
        updates.push({
          id: stock.id,
          data: { amountLevel: newLevel },
        });
      }
    }
  }

  return { update: updates, delete: deletes };
}

/**
 * Helper to decrease amount level
 */
export function decreaseAmountLevel(current: string): string {
  // Levels map
  const levels = ["たっぷり", "普通", "少ない", "ほぼない", "なし"];
  const currentIndex = levels.indexOf(current);

  if (currentIndex === -1) return "普通"; // Default fallback

  const nextIndex = Math.min(currentIndex + 1, levels.length - 1);
  return levels[nextIndex] ?? "なし";
}

/**
 * Helper to increase amount level (for cancellation)
 */
export function increaseAmountLevel(current: string): string {
  const levels = ["たっぷり", "普通", "少ない", "ほぼない", "なし"];
  const currentIndex = levels.indexOf(current);

  if (currentIndex === -1) return "普通";

  const prevIndex = Math.max(currentIndex - 1, 0);
  return levels[prevIndex] ?? "たっぷり";
}
