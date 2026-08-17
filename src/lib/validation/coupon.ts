import { z } from "zod";

export const couponSchema = z.object({
  code: z.string().min(2, "Code is required").toUpperCase(),
  type: z.enum(["percentage", "fixed"]),
  value: z.coerce.number().positive("Value must be greater than 0"),
  scope: z.enum(["all", "book", "category"]).default("all"),
  bookIds: z.array(z.string().uuid()).default([]),
  categoryIds: z.array(z.string().uuid()).default([]),
  minimumOrderAmount: z.coerce.number().nonnegative().default(0),
  usageLimit: z.coerce.number().int().positive().optional().nullable(),
  perCustomerLimit: z.coerce.number().int().positive().optional().nullable(),
  startsAt: z.string().optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});
export type CouponInput = z.infer<typeof couponSchema>;
