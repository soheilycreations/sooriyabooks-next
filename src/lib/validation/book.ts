import { z } from "zod";

export const bookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional().or(z.literal("")),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, letters/numbers/hyphens only"),
  isbn: z.string().optional().or(z.literal("")),
  sku: z.string().min(1, "SKU is required"),
  authorId: z.string().uuid().optional().nullable(),
  publisherId: z.string().uuid().optional().nullable(),
  language: z.string().min(1).default("English"),
  edition: z.string().optional().or(z.literal("")),
  pageCount: z.coerce.number().int().positive().optional().nullable(),
  weightGrams: z.coerce.number().int().positive("Weight is required for shipping calculation"),
  description: z.string().optional().or(z.literal("")),
  shortDescription: z.string().optional().or(z.literal("")),
  sellingPrice: z.coerce.number().nonnegative(),
  discountPrice: z.coerce.number().nonnegative().optional().nullable(),
  categoryIds: z.array(z.string().uuid()).default([]),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isActive: z.boolean().default(true),
  seoTitle: z.string().optional().or(z.literal("")),
  seoDescription: z.string().optional().or(z.literal("")),
  // Off by default — a new book shouldn't silently show "Out of Stock" just
  // because staff didn't get around to typing a quantity. Staff can turn
  // tracking on and set a real number whenever they actually want it.
  trackStock: z.boolean().default(false),
  stockQuantity: z.coerce.number().int().nonnegative().default(0),
  lowStockThreshold: z.coerce.number().int().nonnegative().default(5),
}).refine((data) => !data.discountPrice || data.discountPrice <= data.sellingPrice, {
  message: "Discount price cannot exceed selling price",
  path: ["discountPrice"],
});

export type BookInput = z.infer<typeof bookSchema>;
