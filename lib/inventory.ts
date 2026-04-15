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
  inStock?: { amount: number | string; unit: string }; 
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
    個: standardWeight,
    piece: standardWeight,
    slice: 15,
    丁: 350,
    cho: 350,
    束: 200,
    bunch: 200,
    袋: 100,
    bag: 100,
    合: 150,
    go: 150,
    升: 1500,
    sho: 1500,
    パック: 200,
    pack: 200,
    本: 150,
    玉: standardWeight,
    枚: ingredientName?.toLowerCase().includes('肉') ? 20 : 15,
    切れ: 80,
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
  customImplicitIngredients?: string[],
): IngredientAvailability {
  const available: IngredientMatch[] = [];
  const insufficient: IngredientMatch[] = [];
  const missing: IngredientMatch[] = [];

  for (const required of requiredIngredients) {
    if (!required?.name || typeof required.name !== "string") continue;

    if (isImplicitIngredient(required.name, customImplicitIngredients)) {
      available.push({
        name: required.name,
        required: { amount: required.amount, unit: required.unit },
        inStock: { amount: "常に利用可能", unit: "implicit" },
        status: "available",
      });
      continue;
    }

    const stock = userInventory.find((i) => {
      const s = i.name.toLowerCase().trim();
      const r = required.name.toLowerCase().trim();
      return s === r || s.includes(r) || r.includes(s);
    });

    if (!stock || stock.amount === null || stock.amount <= 0) {
      missing.push({
        name: required.name,
        required: { amount: required.amount, unit: required.unit },
        status: "missing",
      });
      continue;
    }

    const stockNormalized = normalizeAmount(stock.amount, stock.unit ?? "", stock.name);
    const requiredNormalized = normalizeAmount(required.amount, required.unit, required.name);

    if (stockNormalized >= requiredNormalized) {
      available.push({
        name: required.name,
        required: { amount: required.amount, unit: required.unit },
        inStock: { amount: stock.amount, unit: stock.unit ?? "" },
        status: "available",
      });
    } else {
      insufficient.push({
        name: required.name,
        required: { amount: required.amount, unit: required.unit },
        inStock: { amount: stock.amount, unit: stock.unit ?? "" },
        shortage: { 
          amount: Math.max(0, required.amount - (stock.unit?.toLowerCase() === required.unit.toLowerCase() ? stock.amount : 0)), 
          unit: required.unit 
        },
        status: "insufficient",
      });
    }
  }

  return { available, insufficient, missing };
}

/**
 * Calculate new inventory state after usage
 */
export function calculateInventoryUpdates(
  usedIngredients: UsedIngredient[],
  userInventory: Ingredient[],
): { update: { id: string; data: Partial<Ingredient> }[]; delete: { id: string }[] } {
  const updates: { id: string; data: Partial<Ingredient> }[] = [];
  const deletes: { id: string }[] = [];

  for (const used of usedIngredients) {
    if (!used?.name) continue;

    const stock = userInventory.find((i) => {
      const s = i.name.toLowerCase().trim();
      const u = used.name.toLowerCase().trim();
      return s === u || s.includes(u) || u.includes(s);
    });

    if (!stock || stock.amount === null) continue;

    const stockNormalized = normalizeAmount(stock.amount, stock.unit ?? "", stock.name);
    const usedNormalized = normalizeAmount(used.amount, used.unit, used.name);
    const newAmountNormalized = stockNormalized - usedNormalized;

    let newAmount = 0;
    if (stockNormalized > 0) {
      newAmount = Math.max(0, stock.amount * (newAmountNormalized / stockNormalized));
      newAmount = Math.round(newAmount * 10) / 10;
    }

    if (newAmount <= 0.05) {
      deletes.push({ id: stock.id });
    } else {
      updates.push({
        id: stock.id,
        data: { amount: newAmount },
      });
    }
  }

  return { update: updates, delete: deletes };
}
