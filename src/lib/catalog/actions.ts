"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { logAudit } from "@/lib/admin/audit";
import { bookSchema, type BookInput } from "@/lib/validation/book";
import { categorySchema, authorSchema, publisherSchema, type CategoryInput, type AuthorInput, type PublisherInput } from "@/lib/validation/taxonomy";
import type { ActionResult } from "@/lib/auth/actions";

// ---------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------

export async function createBook(input: BookInput): Promise<ActionResult<{ id: string }>> {
  await requireStaff();
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const supabase = await createClient();

  const { data: book, error } = await supabase
    .from("books")
    .insert({
      title: d.title,
      subtitle: d.subtitle || null,
      slug: d.slug,
      isbn: d.isbn || null,
      sku: d.sku,
      author_id: d.authorId || null,
      publisher_id: d.publisherId || null,
      language: d.language,
      edition: d.edition || null,
      page_count: d.pageCount ?? null,
      weight_grams: d.weightGrams,
      description: d.description || null,
      short_description: d.shortDescription || null,
      selling_price: d.sellingPrice,
      discount_price: d.discountPrice ?? null,
      is_featured: d.isFeatured,
      is_new_arrival: d.isNewArrival,
      is_best_seller: d.isBestSeller,
      is_active: d.isActive,
      seo_title: d.seoTitle || null,
      seo_description: d.seoDescription || null,
    })
    .select("id")
    .single();

  if (error || !book) {
    return { ok: false, error: error?.message || "Could not create book" };
  }

  if (d.categoryIds.length > 0) {
    await supabase.from("book_categories").insert(d.categoryIds.map((categoryId) => ({ book_id: book.id, category_id: categoryId })));
  }

  await supabase.from("inventory").insert({
    book_id: book.id,
    quantity_on_hand: d.stockQuantity,
    low_stock_threshold: d.lowStockThreshold,
  });

  const { data: auth } = await supabase.auth.getUser();
  await logAudit({ actorId: auth.user!.id, action: "book.create", entityType: "book", entityId: book.id, after: d });

  revalidateTag("catalog");
  revalidatePath("/admin/products");
  return { ok: true, data: { id: book.id } };
}

export async function updateBook(id: string, input: BookInput): Promise<ActionResult> {
  await requireStaff();
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const supabase = await createClient();

  const { data: before } = await supabase.from("books").select("*").eq("id", id).maybeSingle();

  const { error } = await supabase
    .from("books")
    .update({
      title: d.title,
      subtitle: d.subtitle || null,
      slug: d.slug,
      isbn: d.isbn || null,
      sku: d.sku,
      author_id: d.authorId || null,
      publisher_id: d.publisherId || null,
      language: d.language,
      edition: d.edition || null,
      page_count: d.pageCount ?? null,
      weight_grams: d.weightGrams,
      description: d.description || null,
      short_description: d.shortDescription || null,
      selling_price: d.sellingPrice,
      discount_price: d.discountPrice ?? null,
      is_featured: d.isFeatured,
      is_new_arrival: d.isNewArrival,
      is_best_seller: d.isBestSeller,
      is_active: d.isActive,
      seo_title: d.seoTitle || null,
      seo_description: d.seoDescription || null,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  await supabase.from("book_categories").delete().eq("book_id", id);
  if (d.categoryIds.length > 0) {
    await supabase.from("book_categories").insert(d.categoryIds.map((categoryId) => ({ book_id: id, category_id: categoryId })));
  }

  await supabase
    .from("inventory")
    .upsert({ book_id: id, quantity_on_hand: d.stockQuantity, low_stock_threshold: d.lowStockThreshold });

  const { data: auth } = await supabase.auth.getUser();
  await logAudit({ actorId: auth.user!.id, action: "book.update", entityType: "book", entityId: id, before, after: d });

  revalidateTag("catalog");
  revalidatePath("/admin/products");
  revalidatePath(`/book/${d.slug}`);
  return { ok: true, data: undefined };
}

export async function deleteBook(id: string): Promise<ActionResult> {
  await requireStaff(["admin", "manager"]);
  const supabase = await createClient();
  const { data: before } = await supabase.from("books").select("*").eq("id", id).maybeSingle();
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  const { data: auth } = await supabase.auth.getUser();
  await logAudit({ actorId: auth.user!.id, action: "book.delete", entityType: "book", entityId: id, before });

  revalidateTag("catalog");
  revalidatePath("/admin/products");
  return { ok: true, data: undefined };
}

export async function setBookImages(bookId: string, mediaIds: string[]): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("book_images").delete().eq("book_id", bookId);
  if (mediaIds.length > 0) {
    await supabase.from("book_images").insert(
      mediaIds.map((mediaId, i) => ({ book_id: bookId, media_id: mediaId, is_primary: i === 0, sort_order: i })),
    );
  }
  revalidateTag("catalog");
  revalidatePath(`/admin/products/${bookId}`);
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------

export async function createCategory(input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  await requireStaff();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  const supabase = await createClient();

  const { data: category, error } = await supabase
    .from("categories")
    .insert({
      name: d.name,
      slug: d.slug,
      parent_id: d.parentId || null,
      description: d.description || null,
      image_url: d.imageUrl || null,
      sort_order: d.sortOrder,
      seo_title: d.seoTitle || null,
      seo_description: d.seoDescription || null,
    })
    .select("id")
    .single();

  if (error || !category) return { ok: false, error: error?.message || "Could not create category" };

  revalidateTag("catalog");
  revalidatePath("/admin/categories");
  return { ok: true, data: { id: category.id } };
}

export async function updateCategory(id: string, input: CategoryInput): Promise<ActionResult> {
  await requireStaff();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .update({
      name: d.name,
      slug: d.slug,
      parent_id: d.parentId || null,
      description: d.description || null,
      image_url: d.imageUrl || null,
      sort_order: d.sortOrder,
      seo_title: d.seoTitle || null,
      seo_description: d.seoDescription || null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateTag("catalog");
  revalidatePath("/admin/categories");
  return { ok: true, data: undefined };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireStaff(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateTag("catalog");
  revalidatePath("/admin/categories");
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------
// Authors
// ---------------------------------------------------------------------

export async function createAuthor(input: AuthorInput): Promise<ActionResult<{ id: string }>> {
  await requireStaff();
  const parsed = authorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  const supabase = await createClient();

  const { data: author, error } = await supabase
    .from("authors")
    .insert({
      name: d.name,
      slug: d.slug,
      bio: d.bio || null,
      photo_url: d.photoUrl || null,
      is_featured: d.isFeatured,
      seo_title: d.seoTitle || null,
      seo_description: d.seoDescription || null,
    })
    .select("id")
    .single();

  if (error || !author) return { ok: false, error: error?.message || "Could not create author" };
  revalidateTag("catalog");
  revalidatePath("/admin/authors");
  return { ok: true, data: { id: author.id } };
}

export async function updateAuthor(id: string, input: AuthorInput): Promise<ActionResult> {
  await requireStaff();
  const parsed = authorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("authors")
    .update({
      name: d.name,
      slug: d.slug,
      bio: d.bio || null,
      photo_url: d.photoUrl || null,
      is_featured: d.isFeatured,
      seo_title: d.seoTitle || null,
      seo_description: d.seoDescription || null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateTag("catalog");
  revalidatePath("/admin/authors");
  return { ok: true, data: undefined };
}

export async function deleteAuthor(id: string): Promise<ActionResult> {
  await requireStaff(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("authors").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateTag("catalog");
  revalidatePath("/admin/authors");
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------
// Publishers
// ---------------------------------------------------------------------

export async function createPublisher(input: PublisherInput): Promise<ActionResult<{ id: string }>> {
  await requireStaff();
  const parsed = publisherSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  const supabase = await createClient();

  const { data: publisher, error } = await supabase
    .from("publishers")
    .insert({
      name: d.name,
      slug: d.slug,
      description: d.description || null,
      logo_url: d.logoUrl || null,
      is_featured: d.isFeatured,
      seo_title: d.seoTitle || null,
      seo_description: d.seoDescription || null,
    })
    .select("id")
    .single();

  if (error || !publisher) return { ok: false, error: error?.message || "Could not create publisher" };
  revalidateTag("catalog");
  revalidatePath("/admin/publishers");
  return { ok: true, data: { id: publisher.id } };
}

export async function updatePublisher(id: string, input: PublisherInput): Promise<ActionResult> {
  await requireStaff();
  const parsed = publisherSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("publishers")
    .update({
      name: d.name,
      slug: d.slug,
      description: d.description || null,
      logo_url: d.logoUrl || null,
      is_featured: d.isFeatured,
      seo_title: d.seoTitle || null,
      seo_description: d.seoDescription || null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateTag("catalog");
  revalidatePath("/admin/publishers");
  return { ok: true, data: undefined };
}

export async function deletePublisher(id: string): Promise<ActionResult> {
  await requireStaff(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("publishers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateTag("catalog");
  revalidatePath("/admin/publishers");
  return { ok: true, data: undefined };
}
