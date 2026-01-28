import { z } from "zod";

export const lifestyleModeSchema = z.object({
  timePriority: z.enum(["short", "normal", "long"]),
  dishwashingAvoid: z.boolean(),
  singlePan: z.boolean(),
});

export const tasteJsonSchema = z.object({
  tasteScores: z.record(z.number().min(-2).max(2)),
  tasteLabels: z.record(z.string()),
  equipment: z.array(z.string()),
  preferredMethods: z.array(z.string()),
  avoidedMethods: z.array(z.string()),
  lifestyle: z.object({
    weekdayMode: lifestyleModeSchema,
    weekendMode: lifestyleModeSchema,
    defaultMode: lifestyleModeSchema,
  }),
  goals: z.array(z.string()).optional(),
  freeText: z.string().max(300).optional(),
  recentGenrePenalty: z.record(z.number().min(-1).max(1)).optional(),
});

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

export const tasteUpdateSchema = z.object({
  tasteScores: z.record(z.number().min(-2).max(2)).optional(),
  tasteLabels: z.record(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  lifestyle: z
    .object({
      weekdayMode: lifestyleModeSchema.partial().optional(),
      weekendMode: lifestyleModeSchema.partial().optional(),
      defaultMode: lifestyleModeSchema.partial().optional(),
    })
    .optional(),
  preferredMethods: z.array(z.string()).optional(),
  avoidedMethods: z.array(z.string()).optional(),
  freeText: z.string().max(300).optional(),
});
