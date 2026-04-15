// app/menu/generate/utils.ts

import { 
  InventoryPattern, 
  PATTERN_PRIORITY, 
  PRIORITY_MESSAGES, 
  VEGETABLE_KEYWORDS, 
  PROTEIN_KEYWORDS 
} from "./constants";

/**
 * Total cooking time calculator
 */
export const calculateCookingTime = (dishes: { cookingTime?: number }[]) => {
  if (!dishes) return "20分";
  const sum = dishes.reduce(
    (acc: number, d: { cookingTime?: number }) => acc + (d.cookingTime ?? 0),
    0,
  );
  return sum > 0 ? `${sum}分` : "20分";
};

/**
 * Max difficulty calculator
 */
export const calculateDifficulty = (dishes: { difficulty?: number }[]) => {
  if (!dishes) return "★3";
  const nums = dishes.map((d: { difficulty?: number }) => d.difficulty ?? 3);
  const max = Math.max(...nums);
  return `★${max}`;
};

/**
 * Inventory pattern detector
 */
export function detectInventoryPatterns(
  ingredients: Array<{ name: string; expirationDate?: string | null }>,
  options: {
    inventoryCount: number;
    expiringCount: number;
    servings: number;
    budget: number | null;
    strictMode: boolean;
  }
): InventoryPattern[] {
  const patterns: InventoryPattern[] = [];
  const { inventoryCount, expiringCount, servings, budget, strictMode } = options;

  // 配列チェック
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];

  if (inventoryCount <= 5) patterns.push('lowInventory');
  if (expiringCount > 0) patterns.push('hasExpiring');
  if (budget !== null) patterns.push('hasBudget');
  if (strictMode) patterns.push('strictMode');
  if (servings >= 5) patterns.push('largeServings');

  const vegCount = safeIngredients.filter(i => 
    VEGETABLE_KEYWORDS.some(k => i.name.includes(k))
  ).length;
  const proteinCount = safeIngredients.filter(i => 
    PROTEIN_KEYWORDS.some(k => i.name.includes(k))
  ).length;

  if (vegCount >= inventoryCount * 0.5 && inventoryCount > 0) {
    patterns.push('vegetableHeavy');
  }
  if (proteinCount >= inventoryCount * 0.5 && inventoryCount > 0) {
    patterns.push('proteinHeavy');
  }

  if (patterns.includes('lowInventory') && patterns.includes('largeServings')) {
    patterns.push('constraintHeavy');
  }

  return patterns.sort((a, b) => {
    const indexA = PATTERN_PRIORITY.indexOf(a);
    const indexB = PATTERN_PRIORITY.indexOf(b);
    return indexA - indexB;
  });
}

/**
 * AI Message generator
 */
export function generateContextAwareMessages(
  patterns: InventoryPattern[],
  allGeneralMessages: string[]
): string[] {
  const priorityMessages: string[] = [];
  for (const pattern of patterns) {
    const messages = PRIORITY_MESSAGES[pattern];
    if (messages && messages.length > 0) {
      const selected = messages[Math.floor(Math.random() * messages.length)];
      if (selected) priorityMessages.push(selected);
    }
  }

  const shuffledGeneral = [...allGeneralMessages].sort(() => Math.random() - 0.5);
  const uniquePriorities = [...new Set(priorityMessages)];
  
  return [...uniquePriorities, ...shuffledGeneral];
}
