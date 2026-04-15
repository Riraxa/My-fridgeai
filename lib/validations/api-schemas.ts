import { z } from "zod";

/**
 * Common schema for idempotency key
 */
const IdempotencySchema = z.string().min(1).max(100).optional();

/**
 * POST /api/menu/stream
 */
export const MenuStreamSchema = z.object({
  servings: z.number().int().min(1).max(20).default(2),
  budget: z.number().int().min(0).max(100000).nullable().optional(),
  mode: z.enum(["flexible", "strict"]).default("flexible"),
  idempotencyKey: IdempotencySchema,
});

/**
 * POST /api/menu/cook
 */
export const MenuCookSchema = z.object({
  menuGenerationId: z.string().cuid().optional(),
  selectedMenu: z.enum(["main", "altA", "altB"]).default("main"),
  cookedDishes: z.array(z.string()).optional(),
  usedIngredients: z.array(z.object({
    name: z.string(),
    amount: z.number().nullable().optional(),
    unit: z.string().nullable().optional(),
  })).optional(),
  idempotencyKey: IdempotencySchema,
});

/**
 * POST /api/ingredients/batch
 */
export const IngredientBatchSchema = z.object({
  items: z.array(z.object({
    name: z.string().min(1).max(100),
    amount: z.number().min(0).nullable().optional(),
    unit: z.string().max(20).nullable().optional(),
    category: z.string().max(50).nullable().optional(),
    expirationDate: z.string().datetime().nullable().optional(),
    productId: z.string().optional().nullable(),
  })).min(1).max(50),
  idempotencyKey: IdempotencySchema,
});

export type MenuStreamRequest = z.infer<typeof MenuStreamSchema>;
export type MenuCookRequest = z.infer<typeof MenuCookSchema>;
export type IngredientBatchRequest = z.infer<typeof IngredientBatchSchema>;
