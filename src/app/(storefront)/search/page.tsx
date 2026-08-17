import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/storefront/product-card";
import { sanitizeSearchTerm } from "@/lib/utils";
import type { BookCardData } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; featured?: string; new?: string }>;
}) {
  const { q, featured, new: isNew } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("books")
    .select(
      `id, title, slug, selling_price, discount_price,
       authors ( name ),
       book_images ( is_primary, sort_order, media_assets ( storage_path ) )`,
    )
    .eq("is_active", true)
    .limit(48);

  if (q) {
    const term = sanitizeSearchTerm(q);
    if (term) query = query.or(`title.ilike.%${term}%,isbn.ilike.%${term}%,sku.ilike.%${term}%`);
  }
  if (featured === "1") query = query.eq("is_featured", true);
  if (isNew === "1") query = query.eq("is_new_arrival", true);

  const { data } = await query;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const books: BookCardData[] = (data ?? []).map((row: any) => {
    const images = (row.book_images ?? []) as Array<{ is_primary: boolean; sort_order: number; media_assets: { storage_path: string } | null }>;
    const primary = [...images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];
    const coverUrl = primary?.media_assets?.storage_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${primary.media_assets.storage_path}`
      : null;
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      sellingPrice: Number(row.selling_price),
      discountPrice: row.discount_price ? Number(row.discount_price) : null,
      authorName: row.authors?.name ?? null,
      coverUrl,
    };
  });

  return (
    <div className="container py-12">
      <form className="mb-8 max-w-md">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search books, authors, ISBN..."
          className="h-11 w-full rounded-md border border-input bg-background px-4 text-sm"
        />
      </form>
      <h1 className="mb-6 font-heading text-2xl">
        {q ? `Results for "${q}"` : "All Books"} <span className="text-muted-foreground">({books.length})</span>
      </h1>
      {books.length > 0 ? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {books.map((book) => (
            <ProductCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No books found.</p>
      )}
    </div>
  );
}
