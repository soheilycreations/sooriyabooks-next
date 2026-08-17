import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { BookForm } from "@/components/admin/book-form";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: book }, { data: authors }, { data: publishers }, { data: categories }, { data: bookCategories }, { data: images }, { data: inventory }] =
    await Promise.all([
      supabase.from("books").select("*").eq("id", id).maybeSingle(),
      supabase.from("authors").select("id, name").order("name"),
      supabase.from("publishers").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("book_categories").select("category_id").eq("book_id", id),
      supabase
        .from("book_images")
        .select("id, media_id, sort_order, is_primary, media_assets ( storage_path )")
        .eq("book_id", id)
        .order("sort_order"),
      supabase.from("inventory").select("quantity_on_hand, low_stock_threshold").eq("book_id", id).maybeSingle(),
    ]);

  if (!book) notFound();

  const sortedImages = [...(images ?? [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  );
  const initialImages = sortedImages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((img: any) => ({
      mediaId: img.media_id as string,
      url: img.media_assets?.storage_path
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${img.media_assets.storage_path}`
        : "",
    }))
    .filter((img) => img.url);

  return (
    <div>
      <AdminPageHeader title={`Edit: ${book.title}`} />
      <BookForm
        bookId={id}
        authors={authors ?? []}
        publishers={publishers ?? []}
        categories={categories ?? []}
        initialImages={initialImages}
        initial={{
          title: book.title,
          subtitle: book.subtitle ?? "",
          slug: book.slug,
          isbn: book.isbn ?? "",
          sku: book.sku,
          authorId: book.author_id,
          publisherId: book.publisher_id,
          language: book.language,
          edition: book.edition ?? "",
          pageCount: book.page_count,
          weightGrams: book.weight_grams,
          description: book.description ?? "",
          shortDescription: book.short_description ?? "",
          sellingPrice: Number(book.selling_price),
          discountPrice: book.discount_price ? Number(book.discount_price) : null,
          categoryIds: (bookCategories ?? []).map((c) => c.category_id),
          isFeatured: book.is_featured,
          isNewArrival: book.is_new_arrival,
          isBestSeller: book.is_best_seller,
          isActive: book.is_active,
          seoTitle: book.seo_title ?? "",
          seoDescription: book.seo_description ?? "",
          stockQuantity: inventory?.quantity_on_hand ?? 0,
          lowStockThreshold: inventory?.low_stock_threshold ?? 5,
        }}
      />
    </div>
  );
}
