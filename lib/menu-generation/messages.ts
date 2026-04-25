import {
  type InventoryPattern,
  PATTERN_PRIORITY,
  PRIORITY_MESSAGES,
  PROTEIN_KEYWORDS,
  VEGETABLE_KEYWORDS,
} from "./inventory-patterns";

export function detectInventoryPatterns(
  ingredients: Array<{ name: string; expirationDate?: string | null }>,
  options: {
    inventoryCount: number;
    expiringCount: number;
    servings: number;
    budget: number | null;
    generationMode: string;
  },
): InventoryPattern[] {
  const patterns: InventoryPattern[] = [];
  const { inventoryCount, expiringCount, servings, budget, generationMode } = options;
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];

  if (inventoryCount <= 5) patterns.push("lowInventory");
  if (expiringCount > 0) patterns.push("hasExpiring");
  if (budget !== null) patterns.push("hasBudget");
  if (generationMode === "strict") patterns.push("strictMode");
  if (generationMode === "quick") patterns.push("quickMode");
  if (generationMode === "use-up") patterns.push("useUpMode");
  if (servings >= 5) patterns.push("largeServings");

  const vegCount = safeIngredients.filter((i) =>
    VEGETABLE_KEYWORDS.some((k) => i.name.includes(k)),
  ).length;
  const proteinCount = safeIngredients.filter((i) =>
    PROTEIN_KEYWORDS.some((k) => i.name.includes(k)),
  ).length;

  if (vegCount >= inventoryCount * 0.5 && inventoryCount > 0) {
    patterns.push("vegetableHeavy");
  }
  if (proteinCount >= inventoryCount * 0.5 && inventoryCount > 0) {
    patterns.push("proteinHeavy");
  }
  if (patterns.includes("lowInventory") && patterns.includes("largeServings")) {
    patterns.push("constraintHeavy");
  }

  return patterns.sort(
    (a, b) => PATTERN_PRIORITY.indexOf(a) - PATTERN_PRIORITY.indexOf(b),
  );
}

export function generateContextAwareMessages(
  patterns: InventoryPattern[],
  allGeneralMessages: string[],
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
  return [...new Set(priorityMessages), ...shuffledGeneral];
}
