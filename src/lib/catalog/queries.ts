import { createClient } from "@/lib/supabase/server";
import { selectNavCategories } from "@/lib/catalog/nav-categories";
import { decodeHtmlEntities, sanitizeSearchTerm } from "@/lib/utils";

export interface BookCardData {
  id: string;
  title: string;
  slug: string;
  sellingPrice: number;
  discountPrice: number | null;
  authorName: string | null;
  coverUrl: string | null;
  /** Undefined when the query didn't join inventory — treat as "unknown", not "out of stock". */
  inStock?: boolean;
  lowStock?: boolean;
}

function resolveCoverUrl(storagePath: string | null): string | null {
  if (!storagePath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/media/${storagePath}`;
}

/** Books for homepage/category/search grids. Returns [] gracefully if the catalog is empty (pre-migration). */
export const BOOK_CARD_SELECT_WITH_STOCK = `id, title, slug, selling_price, discount_price, created_at,
       authors ( name ),
       book_images ( is_primary, sort_order, media_assets ( storage_path ) ),
       inventory ( quantity_on_hand, quantity_reserved, low_stock_threshold, stock_tracking_enabled, untracked_available )`;

export async function getFeaturedBooks(limit = 8): Promise<BookCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .select(BOOK_CARD_SELECT_WITH_STOCK)
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  if (data.length > 0) return data.map(mapBookRowToCard);

  // No admin has curated `is_featured` picks yet. Rather than show a
  // misleading "catalog is empty" message when the catalog plainly isn't,
  // fall back to real active books — offset past the New Arrivals slice
  // below so the two sections don't just show the same books twice. This
  // is a data-completeness fallback, not fabricated content: every book
  // here is a genuine, active product; it stops applying the moment an
  // admin sets `is_featured` on anything.
  const { data: fallback } = await supabase
    .from("books")
    .select(BOOK_CARD_SELECT_WITH_STOCK)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(limit, limit * 2 - 1);

  return (fallback ?? []).map(mapBookRowToCard);
}

export async function getNewArrivals(limit = 8): Promise<BookCardData[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select(BOOK_CARD_SELECT_WITH_STOCK)
    .eq("is_active", true)
    .eq("is_new_arrival", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (data && data.length > 0) return data.map(mapBookRowToCard);

  // Same fallback rationale as getFeaturedBooks: no admin has flagged
  // `is_new_arrival` yet, so surface the most recently added active books —
  // which is literally what "new arrivals" means — instead of hiding the
  // section entirely.
  const { data: fallback } = await supabase
    .from("books")
    .select(BOOK_CARD_SELECT_WITH_STOCK)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (fallback ?? []).map(mapBookRowToCard);
}

/**
 * Same filter shape as the /search page (title/isbn/sku ilike, active only)
 * — factored out so the header's live search overlay and the full search
 * page query the catalog identically instead of each hand-rolling its own
 * filter. Empty/blank terms return [] rather than the newest N books, since
 * an overlay-preview list showing "no query, most recent 8" would read as a
 * broken/random result set to someone who hasn't typed anything yet.
 */
export async function searchBooksPreview(term: string, limit = 8): Promise<BookCardData[]> {
  const cleaned = sanitizeSearchTerm(term);
  if (!cleaned) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select(BOOK_CARD_SELECT_WITH_STOCK)
    .eq("is_active", true)
    .or(`title.ilike.%${cleaned}%,isbn.ilike.%${cleaned}%,sku.ilike.%${cleaned}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map(mapBookRowToCard);
}

export type BookSort = "newest" | "price_asc" | "price_desc";

export const SORT_COLUMN: Record<BookSort, { column: string; ascending: boolean }> = {
  newest: { column: "created_at", ascending: false },
  price_asc: { column: "selling_price", ascending: true },
  price_desc: { column: "selling_price", ascending: false },
};

export async function getBooksByCategory(
  categorySlug: string,
  { limit = 24, sort = "newest" }: { limit?: number; sort?: BookSort } = {},
): Promise<{ books: BookCardData[]; total: number }> {
  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (!category) return { books: [], total: 0 };

  // Base table must be `books` itself, not the book_categories join table —
  // .order(col, { foreignTable }) on a nested embed silently no-ops against
  // this project's PostgREST (it generates `books.order=col.asc`, which is
  // ignored rather than erroring). Ordering the base table directly is
  // exactly how search's already-correct sort works.
  const { column, ascending } = SORT_COLUMN[sort];
  const { data, count } = await supabase
    .from("books")
    .select(`${BOOK_CARD_SELECT_WITH_STOCK}, book_categories!inner ( category_id )`, { count: "exact" })
    .eq("is_active", true)
    .eq("book_categories.category_id", category.id)
    .order(column, { ascending })
    .limit(limit);

  const books = (data ?? []).map(mapBookRowToCard);
  return { books, total: count ?? books.length };
}

/** Other active books sharing at least one category with this book — excludes the book itself. */
export async function getRelatedBooks(bookId: string, limit = 4): Promise<BookCardData[]> {
  const supabase = await createClient();
  const { data: categoryLinks } = await supabase
    .from("book_categories")
    .select("category_id")
    .eq("book_id", bookId);

  const categoryIds = (categoryLinks ?? []).map((c) => c.category_id);
  if (categoryIds.length === 0) return [];

  const { data } = await supabase
    .from("book_categories")
    .select(
      `books!inner (
        id, title, slug, selling_price, discount_price, is_active,
        authors ( name ),
        book_images ( is_primary, sort_order, media_assets ( storage_path ) ),
        inventory ( quantity_on_hand, quantity_reserved, low_stock_threshold, stock_tracking_enabled, untracked_available )
      )`,
    )
    .in("category_id", categoryIds)
    .eq("books.is_active", true)
    .neq("book_id", bookId)
    .limit(limit * 3); // over-fetch — the same book can repeat across categories, dedupe below

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seen = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data ?? []) as any[]) {
    if (row.books && !seen.has(row.books.id)) seen.set(row.books.id, row.books);
  }
  return Array.from(seen.values()).slice(0, limit).map(mapBookRowToCard);
}

export async function getBookBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select(
      `*, authors ( id, name, slug ), publishers ( id, name, slug ),
       book_images ( id, is_primary, sort_order, media_assets ( storage_path, alt_text ) ),
       inventory ( quantity_on_hand, quantity_reserved, stock_tracking_enabled, untracked_available )`,
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

export interface StoreStats {
  bookCount: number;
  categoryCount: number;
}

/** Live counts for the brand-story section — never hardcode these, the catalog changes. */
export async function getStoreStats(): Promise<StoreStats> {
  const supabase = await createClient();
  const [books, categories] = await Promise.all([
    supabase.from("books").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("categories").select("id", { count: "exact", head: true }),
  ]);
  return { bookCount: books.count ?? 0, categoryCount: categories.count ?? 0 };
}

export interface CategoryShelfEntry {
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  bookCount: number;
  /** Real cover URLs of active books in this category (0-4 for the
   *  featured tile, 0-3 for the rest), deduped across every category on the
   *  shelf — used to compose the tile from actual product imagery instead
   *  of an invented one. Empty when the category currently has no covered
   *  books. */
  coverUrls: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCategoryCoverUrls(supabase: any, categoryId: string, limit: number): Promise<string[]> {
  // No .order() here on purpose: with book_categories as the base table,
  // ordering by an embedded books.* column silently no-ops on this
  // PostgREST version (see getBooksByCategory's comment for the same
  // finding) — the base table itself has nothing meaningful to sort by,
  // so this intentionally takes whatever the join returns first.
  const { data } = await supabase
    .from("book_categories")
    .select(
      `books!inner ( id, is_active, book_images ( is_primary, sort_order, media_assets ( storage_path ) ) )`,
    )
    .eq("category_id", categoryId)
    .eq("books.is_active", true)
    .limit(limit * 4); // overfetch — some books in the join have no image row

  const urls: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data ?? []) as any[]) {
    if (urls.length >= limit) break;
    const images = (row.books?.book_images ?? []) as Array<{
      is_primary: boolean;
      sort_order: number;
      media_assets: { storage_path: string } | null;
    }>;
    const primary = [...images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];
    const url = resolveCoverUrl(primary?.media_assets?.storage_path ?? null);
    if (url) urls.push(url);
  }
  return urls;
}

/**
 * Top-level categories for the homepage "shelf" — real counts and real book
 * covers, no invented data. "Sooriya Books" (the publisher's own imprint) is
 * the featured tile when it exists; the rest are the highest-volume real
 * categories by live book count, not import sort_order. Falls back to the
 * highest-count category as the feature if "Sooriya Books" isn't present,
 * so the layout still works on a catalog that doesn't have it.
 */
export async function getCategoryShelfData(limit = 6): Promise<CategoryShelfEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url")
    .is("parent_id", null)
    .order("sort_order")
    .limit(80);

  const candidates = selectNavCategories(data ?? [], 40) as Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
  }>;

  const counts = await Promise.all(
    candidates.map((c) =>
      supabase
        .from("book_categories")
        .select("books!inner(id)", { count: "exact", head: true })
        .eq("category_id", c.id)
        .eq("books.is_active", true),
    ),
  );

  const withCounts = candidates.map((c, i) => ({ ...c, bookCount: counts[i]?.count ?? 0 }));
  const byCountDesc = [...withCounts].sort((a, b) => b.bookCount - a.bookCount);

  const featuredIndex = withCounts.findIndex((c) => c.name.trim().toLowerCase() === "sooriya books");
  const featured = featuredIndex >= 0 ? withCounts[featuredIndex] : byCountDesc[0];
  const rest = byCountDesc.filter((c) => c.id !== featured?.id).slice(0, Math.max(0, limit - 1));

  const ordered = featured ? [featured, ...rest] : rest;

  // Overfetch raw candidates per category, then dedupe globally in order
  // (featured tile first) so the same book's cover — a book can legitimately
  // sit in more than one category — never shows up in two different tiles.
  const rawCovers = await Promise.all(ordered.map((c) => getCategoryCoverUrls(supabase, c.id, 8)));
  const usedUrls = new Set<string>();
  const covers = rawCovers.map((urls, i) => {
    // Small tiles get up to 3 (not just 1) so the card can compose a real
    // multi-cover editorial layout (two overlapping, one dominant + one
    // floating, a mini shelf) instead of a single flat cover — still just a
    // deeper slice of the same already-fetched real data, not a new query.
    const wanted = i === 0 ? 4 : 3;
    const picked: string[] = [];
    for (const url of urls) {
      if (picked.length >= wanted) break;
      if (usedUrls.has(url)) continue;
      usedUrls.add(url);
      picked.push(url);
    }
    return picked;
  });

  return ordered.map((c, i) => ({
    name: decodeHtmlEntities(c.name),
    slug: c.slug,
    description: c.description ? decodeHtmlEntities(c.description) : c.description,
    imageUrl: c.image_url,
    bookCount: c.bookCount,
    coverUrls: covers[i] ?? [],
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBookRowToCard(row: any): BookCardData {
  const images = (row.book_images ?? []) as Array<{
    is_primary: boolean;
    sort_order: number;
    media_assets: { storage_path: string } | null;
  }>;
  const primary = [...images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];

  const inv = row.inventory as {
    quantity_on_hand: number;
    quantity_reserved: number;
    low_stock_threshold: number;
    stock_tracking_enabled: boolean;
    untracked_available: boolean;
  } | null | undefined;

  let inStock: boolean | undefined;
  let lowStock = false;
  if (inv) {
    if (inv.stock_tracking_enabled) {
      const available = inv.quantity_on_hand - inv.quantity_reserved;
      inStock = available > 0;
      lowStock = inStock && available <= inv.low_stock_threshold;
    } else {
      inStock = inv.untracked_available;
    }
  }

  return {
    id: row.id,
    title: decodeHtmlEntities(row.title),
    slug: row.slug,
    sellingPrice: Number(row.selling_price),
    discountPrice: row.discount_price ? Number(row.discount_price) : null,
    authorName: row.authors?.name ? decodeHtmlEntities(row.authors.name) : null,
    coverUrl: resolveCoverUrl(primary?.media_assets?.storage_path ?? null),
    inStock,
    lowStock,
  };
}
