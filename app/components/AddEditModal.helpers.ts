import * as z from "zod";
import type { Ingredient } from "@/types";

export const addEditSchema = z.object({
  name: z.string().min(1, "食材名を入力してください"),
  amountMode: z.enum(["precise", "rough"]),
  amount: z.number().nullable(),
  amountLevel: z.enum(["たっぷり", "普通", "少ない", "ほぼない"]),
  unit: z.string(),
  expirationDate: z.date().nullable(),
  noExpiry: z.boolean(),
  category: z.string(),
});

export type AddEditFormData = z.infer<typeof addEditSchema>;

export function getDefaultValues(item: Ingredient | null): AddEditFormData {
  return {
    name: item?.name ?? "",
    amountMode: item?.amountLevel ? "rough" : "precise",
    amount: item?.amount ?? item?.quantity ?? null,
    amountLevel: (item?.amountLevel as AddEditFormData["amountLevel"]) ?? "普通",
    unit: item?.unit ?? "個",
    expirationDate: item?.expirationDate ? new Date(item.expirationDate) : null,
    noExpiry: !item?.expirationDate,
    category: item?.category ?? "その他",
  };
}

export async function fetchIngredientEstimate(name: string) {
  const res = await fetch("/api/ingredients/estimate-expiration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export function buildIngredientPayload(data: AddEditFormData, item: Ingredient | null) {
  const payload = {
    name: data.name.trim(),
    category: data.category,
    expirationDate: data.noExpiry
      ? null
      : data.expirationDate
        ? data.expirationDate.toISOString()
        : null,
    amount: data.amountMode === "precise" ? Number(data.amount || 0) : null,
    amountLevel: data.amountMode === "rough" ? data.amountLevel : null,
    unit: data.amountMode === "precise" ? data.unit : null,
    ingredientType: "raw" as const,
    quantity:
      data.amountMode === "precise"
        ? Number(data.amount || 0)
        : data.amountMode === "rough"
          ? 0
          : (item?.quantity ?? 0),
  };
  if (item?.id) (payload as any).id = item.id;
  return payload;
}
