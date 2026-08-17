import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1).regex(slugPattern, "Lowercase letters/numbers/hyphens only"),
  parentId: z.string().uuid().optional().nullable(),
  description: z.string().optional().or(z.literal("")),
  imageUrl: z.string().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().default(0),
  seoTitle: z.string().optional().or(z.literal("")),
  seoDescription: z.string().optional().or(z.literal("")),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const authorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1).regex(slugPattern, "Lowercase letters/numbers/hyphens only"),
  bio: z.string().optional().or(z.literal("")),
  photoUrl: z.string().optional().or(z.literal("")),
  isFeatured: z.boolean().default(false),
  seoTitle: z.string().optional().or(z.literal("")),
  seoDescription: z.string().optional().or(z.literal("")),
});
export type AuthorInput = z.infer<typeof authorSchema>;

export const publisherSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1).regex(slugPattern, "Lowercase letters/numbers/hyphens only"),
  description: z.string().optional().or(z.literal("")),
  logoUrl: z.string().optional().or(z.literal("")),
  isFeatured: z.boolean().default(false),
  seoTitle: z.string().optional().or(z.literal("")),
  seoDescription: z.string().optional().or(z.literal("")),
});
export type PublisherInput = z.infer<typeof publisherSchema>;
