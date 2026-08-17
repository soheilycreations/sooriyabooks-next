import { createClient } from "@/lib/supabase/server";

export interface BookCardData {
  id: string;
  title: string;
  slug: string;
  sellingPrice: number;
  discountPrice: number | null;
  authorName: string | null;
  coverUrl: string | null;
}

function resolveCoverUrl(storagePath: string | null): string | null {
  if (!storagePath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/media/${storagePath}`;
}

/** Books for homepage/category grids. Returns [] gracefully if the catalog is empty (pre-migration). */
export async function getFeaturedBooks(limit = 8): Promise<BookCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .select(
      `id, title, slug, selling_price, discount_price,
       authors ( name ),
       book_images ( is_primary, sort_order, media_assets ( storage_path ) )`,
    )
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(mapBookRowToCard);
}

export async function getNewArrivals(limit = 8): Promise<BookCardData[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select(
      `id, title, slug, selling_price, discount_price,
       authors ( name ),
       book_images ( is_primary, sort_order, media_assets ( storage_path ) )`,
    )
    .eq("is_active", true)
    .eq("is_new_arrival", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map(mapBookRowToCard);
}

export async function getBooksByCategory(categorySlug: string, limit = 24): Promise<BookCardData[]> {
  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (!category) return [];

  const { data } = await supabase
    .from("book_categories")
    .select(
      `books!inner (
        id, title, slug, selling_price, discount_price, is_active,
        authors ( name ),
        book_images ( is_primary, sort_order, media_assets ( storage_path ) )
      )`,
    )
    .eq("category_id", category.id)
    .eq("books.is_active", true)
    .limit(limit);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => mapBookRowToCard(row.books));
}

export async function getBookBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select(
      `*, authors ( id, name, slug ), publishers ( id, name, slug ),
       book_images ( id, is_primary, sort_order, media_assets ( storage_path, alt_text ) ),
       inventory ( quantity_on_hand, quantity_reserved )`,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  return data;
}

export async function getAllCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, sort_order")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBookRowToCard(row: any): BookCardData {
  const images = (row.book_images ?? []) as Array<{
    is_primary: boolean;
    sort_order: number;
    media_assets: { storage_path: string } | null;
  }>;
  const primary = [...images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    sellingPrice: Number(row.selling_price),
    discountPrice: row.discount_price ? Number(row.discount_price) : null,
    authorName: row.authors?.name ?? null,
    coverUrl: resolveCoverUrl(primary?.media_assets?.storage_path ?? null),
  };
}
