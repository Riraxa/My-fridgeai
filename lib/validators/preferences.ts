import { z } from "zod";

export const allergySchema = z.object({
  type: z.literal("allergy"),
  allergen: z.string().min(1),
  label: z.string().optional(),
  custom: z.boolean().optional(),
});

export const restrictionSchema = z.object({
  type: z.literal("restriction"),
  restrictionType: z.string().min(1),
  note: z.string().max(100).optional(),
});

export const safetySchema = z.union([allergySchema, restrictionSchema]);
