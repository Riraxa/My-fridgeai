//lib/inventory.ts
import { Ingredient } from "@prisma/client";
import { isImplicitIngredient } from "@/lib/constants/implicit-ingredients";

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
 * Optionally accepts ingredient name for accurate unit conversion
 */
export function normalizeAmount(amount: number, unit: string, ingredientName?: string): number {
  if (!unit || typeof unit !== "string") return amount;

  const normalizedUnit = unit.toLowerCase();

  // 食材ごとの標準的な重さ（個数系単位換算用）
  const itemWeights: Record<string, number> = {
    '卵': 50,
    '玉ねぎ': 200,
    'たまねぎ': 200,
    '玉葱': 200,
    '人参': 150,
    'にんじん': 150,
    'じゃがいも': 150,
    'トマト': 150,
    'とまと': 150,
    'ミニトマト': 15,
    'キャベツ': 1000,
    'レタス': 400,
    '大根': 1000,
    'だいこん': 1000,
    'きゅうり': 100,
    '胡瓜': 100,
    'ピーマン': 30,
    'なす': 80,
    'ナス': 80,
    'りんご': 300,
    'バナナ': 150,
    'みかん': 100,
    '豆腐': 350,
    'とうふ': 350,
    '納豆': 50,
    'パン': 60,
    '食パン': 60,
    '牛乳': 1000,
  };

  // 食材名からマッチする重さを探す
  let standardWeight = 100; // デフォルト 100g
  if (ingredientName) {
    const normalizedName = ingredientName.toLowerCase().trim();
    for (const [name, weight] of Object.entries(itemWeights)) {
      if (normalizedName.includes(name.toLowerCase())) {
        standardWeight = weight;
        break;
      }
    }
  }

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
    // 個数系単位は食材に応じた重さを使用
    個: standardWeight,
    piece: standardWeight,
    slice: 15, // スライスは薄いので15g程度

    // 拡張単位変換 (全て g/ml 換算の目安)
    丁: 350,   // 豆腐 1丁 ≈ 300-400g
    cho: 350,
    束: 200,   // ほうれん草など 1束 ≈ 200g
    bunch: 200,
    袋: 100,   // きのこ、カット野菜など 1袋 ≈ 100g
    bag: 100,
    合: 150,   // 米 1合 = 150g
    go: 150,
    升: 1500,  // 米 1升 = 1.5kg
    sho: 1500,
    パック: 200, // 肉・魚 1パック (小) ≈ 200g
    pack: 200,
    本: 150,   // 人参・大根など
    玉: standardWeight,   // 玉ねぎ1個など（食材に応じた重さ）
    枚: ingredientName?.toLowerCase().includes('肉') ? 20 : 15, // 肉なら20g
    切れ: 80,  // 魚の切り身
  };

  const factor = unitMap[normalizedUnit];
  return amount * (factor ?? 1);
}

/**
 * Check if the user has enough ingredients for a recipe.
 * @param requiredIngredients - 必要な食材リスト
 * @param userInventory - ユーザーの在庫
 * @param customImplicitIngredients - カスタム暗黙食材（オプション）
 */
export function checkIngredientAvailability(
  requiredIngredients: RequiredIngredient[],
  userInventory: Ingredient[],
  customImplicitIngredients?: string[],
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

    // 1. 暗黙食材なら常に利用可能とする
    if (isImplicitIngredient(required.name, customImplicitIngredients)) {
      available.push({
        name: required.name,
        required: { amount: required.amount, unit: required.unit },
        inStock: { amount: "常に利用可能", unit: "implicit" },
        status: "available",
      });
      continue;
    }

    // Find matching ingredient in inventory
    // More flexible matching: exact match, prefix match, or suffix match
    const stock = userInventory.find((i) => {
      if (!i.name || typeof i.name !== "string") return false;
      if (!required.name || typeof required.name !== "string") return false;

      const s = i.name.toLowerCase().trim();
      const r = required.name.toLowerCase().trim();
      
      // Exact match
      if (s === r) return true;
      
      // Prefix match (e.g., "パン" matches "食パン")
      if (s.startsWith(r) || r.startsWith(s)) return true;
      
      // Suffix match (e.g., "パン" matches "フランスパン")
      if (s.endsWith(r) || r.endsWith(s)) return true;
      
      // Contains match for partial matches (e.g., "牛乳" matches "調整牛乳")
      if (s.includes(r) || r.includes(s)) return true;
      
      return false;
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
      const stockNormalized = normalizeAmount(stock.amount, stock.unit ?? "", stock.name);
      const requiredNormalized = normalizeAmount(
        required.amount,
        required.unit,
        required.name,
      );

      if (stockNormalized >= requiredNormalized) {
        available.push({
          name: required.name,
          required: { amount: required.amount, unit: required.unit },
          inStock: { amount: stock.amount, unit: stock.unit ?? "" },
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
          inStock: { amount: stock.amount, unit: stock.unit ?? "" },
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
): { update: { id: string; data: Partial<Ingredient> }[]; delete: { id: string }[] } {
  const updates: { id: string; data: Partial<Ingredient> }[] = [];
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
      const stockNormalized = normalizeAmount(stock.amount, stock.unit ?? "", stock.name);
      const usedNormalized = normalizeAmount(used.amount, used.unit, used.name);

      const newAmountNormalized = stockNormalized - usedNormalized;

      // We need to convert back to stock unit to update DB
      // Ratio = newAmountNormalized / stockNormalized
      // NewStockAmount = stock.amount * Ratio

      let newAmount = 0;
      if (stockNormalized > 0) {
        newAmount = stock.amount * (newAmountNormalized / stockNormalized);
        // 小数点第一位まで表示し、それ以降は四捨五入
        newAmount = Math.round(newAmount * 10) / 10;
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
