export interface ParsedItem {
  id: string;
  lineText: string;
  productName: string | null;
  normalizedName: string | null;
  mappedIngredientId: string | null;
  mappedIngredientName: string | null;
  processedCategory: string | null;
  quantityValue: number | null;
  quantityUnit: string | null;
  inferredLevel: string | null;
  confidenceScore: number;
  // UI-only fields
  action: "add" | "skip";
  editedName: string;
  editedQuantity: number;
  editedUnit: string;
  editedCategory: string;
  estimatedExpirationDays: number | null;
}

export type ScanStep = "upload" | "scanning" | "results" | "confirming" | "done" | "error";

export interface ScanProgressStep {
  label: string;
  status: "pending" | "doing" | "done";
}
