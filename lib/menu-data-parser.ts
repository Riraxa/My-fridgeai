import { z } from "zod";

export const IngredientSchema = z.object({
  name: z.string(),
  amount: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
}).catchall(z.any());

export const DishSchema = z.object({
  name: z.string(),
  type: z.string().optional().nullable(),
  ingredients: z.array(IngredientSchema).nullish().transform(v => v ?? []),
  steps: z.array(z.string()).nullish().transform(v => v ?? []),
  tips: z.array(z.string()).nullish().transform(v => v ?? []),
  storage: z.string().optional().nullable(),
  time_minutes: z.number().optional().nullable(),
  difficulty: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
}).catchall(z.any());

export const MenuDataSchema = z.object({
  title: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  dishes: z.array(DishSchema).nullish().transform(v => v ?? []),
}).catchall(z.any());

export const parseMenuData = (data: unknown) => {
  if (!data || typeof data !== "object") return { dishes: [] };
  const result = MenuDataSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.error("Zod MenuData Parse Error:", result.error);
  return { dishes: [] };
};
