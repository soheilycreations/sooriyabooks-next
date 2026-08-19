import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/storefront/product-card";
import { SortSelect } from "@/components/storefront/sort-select";
import { Reveal } from "@/components/storefront/reveal";
import { sanitizeSearchTerm } from "@/lib/utils";
import { BOOK_CARD_SELECT_WITH_STOCK, SORT_COLUMN, mapBookRowToCard, type BookSort } from "@/lib/catalog/queries";
import { getWishlistBookIds } from "@/lib/customers/wishlist-actions";

export const metadata: Metadata = { title: "Search" };

const PAGE_SIZE = 24;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; featured?: string; new?: string; sort?: string; limit?: string }>;
}) {
  const { q, featured, new: isNew, sort: sortParam, limit: limitParam } = await searchParams;
  const supabase = await createClient();

  const sort: BookSort = sortParam === "price_asc" || sortParam === "price_desc" ? sortParam : "newest";
  const limit = Math.max(PAGE_SIZE, Number(limitParam) || PAGE_SIZE);
  const { column, ascending } = SORT_COLUMN[sort];

  let query = supabase
    .from("books")
    .select(BOOK_CARD_SELECT_WITH_STOCK, { count: "exact" })
    .eq("is_active", true)
    .order(column, { ascending })
    .limit(limit);

  if (q) {
    const term = sanitizeSearchTerm(q);
    if (term) query = query.or(`title.ilike.%${term}%,isbn.ilike.%${term}%,sku.ilike.%${term}%`);
  }
  if (featured === "1") query = query.eq("is_featured", true);
  if (isNew === "1") query = query.eq("is_new_arrival", true);

  const [{ data, count }, wishlistIds] = await Promise.all([query, getWishlistBookIds()]);

  const books = (data ?? []).map(mapBookRowToCard);
  const total = count ?? books.length;
  const hasMore = books.length < total;

  const moreParams = new URLSearchParams();
  if (q) moreParams.set("q", q);
  if (featured) moreParams.set("featured", featured);
  if (isNew) moreParams.set("new", isNew);
  if (sortParam) moreParams.set("sort", sortParam);
  moreParams.set("limit", String(limit + PAGE_SIZE));

  const heading = q ? `Results for "${q}"` : featured === "1" ? "Featured Books" : isNew === "1" ? "New Arrivals" : "All Books";

  return (
    <div className="container py-12 md:py-16">
      <form className="mb-8 max-w-md">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search books, authors, ISBN..."
          className="h-11 w-full rounded-md border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      <div className="mb-8 flex flex-col gap-4 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl leading-tight md:text-4xl md:leading-tight">{heading}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {total} {total === 1 ? "book" : "books"} found
          </p>
        </div>
        {books.length > 0 && <SortSelect />}
      </div>

      {books.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {books.map((book, i) => (
              <Reveal key={book.id} index={i % 8}>
                <ProductCard book={book} showWishlist inWishlist={wishlistIds.has(book.id)} />
              </Reveal>
            ))}
          </div>
          {hasMore && (
            <div className="mt-12 text-center">
              <Link
                href={`?${moreParams.toString()}`}
                className="inline-flex h-11 items-center justify-center rounded-md border border-input px-6 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Load more books
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <SearchX className="h-10 w-10 text-muted-foreground" />
          <p className="font-heading text-xl">No books found</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {q
              ? `Nothing matched "${q}". Try a different title, author, or ISBN.`
              : "Try browsing by category from the menu instead."}
          </p>
        </div>
      )}
    </div>
  );
}
