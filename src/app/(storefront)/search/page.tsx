import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SortSelect } from "@/components/storefront/sort-select";
import { SearchResults } from "@/components/storefront/search-results";
import { SearchFilters } from "@/components/storefront/search-filters";
import { searchBooks, type BookSort, type SearchFilters as BookSearchFilters } from "@/lib/catalog/queries";
import { selectNavCategories } from "@/lib/catalog/nav-categories";
import { getWishlistBookIds } from "@/lib/customers/wishlist-actions";

export const metadata: Metadata = { title: "Search" };

const PAGE_SIZE = 24;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    featured?: string;
    new?: string;
    sort?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}) {
  const { q, featured, new: isNew, sort: sortParam, category, minPrice, maxPrice } = await searchParams;
  const supabase = await createClient();

  const sort: BookSort = sortParam === "price_asc" || sortParam === "price_desc" ? sortParam : "newest";

  const filters: BookSearchFilters = {
    q,
    featured: featured === "1",
    isNew: isNew === "1",
    sort,
    categorySlug: category || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
  };

  const [{ books, total }, wishlistIds, { data: categoryRows }] = await Promise.all([
    searchBooks(filters, 0, PAGE_SIZE),
    getWishlistBookIds(),
    supabase.from("categories").select("id, name, slug, parent_id").is("parent_id", null).order("sort_order").limit(80),
  ]);

  const filterCategories = selectNavCategories(categoryRows ?? [], 60);

  const heading = q
    ? `Results for "${q}"`
    : category
      ? (filterCategories.find((c) => c.slug === category)?.name ?? "Category")
      : featured === "1"
        ? "Featured Books"
        : isNew === "1"
          ? "New Arrivals"
          : "All Books";

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

      {/* The filter sidebar always renders, even with zero results — it's
          the only way to adjust or clear a filter that over-narrowed the
          results, so it can't disappear exactly when it's most needed. */}
      {/* items-start, not the flex default (stretch) — stretch was forcing
          the short filter sidebar's own box to match the much taller
          results grid, leaving a big empty block below its real content
          (visible as a bare white gap in dark mode, since nothing painted
          that stretched space). items-start keeps the sidebar's box sized
          to its own content, and sticky (in SearchFilters) lets it follow
          the scroll alongside the results instead of just sitting short. */}
      <div className="flex flex-col items-start gap-10 md:flex-row">
        <SearchFilters categories={filterCategories} />
        <div className="min-w-0 flex-1">
          {books.length > 0 ? (
            <SearchResults
              initialBooks={books}
              total={total}
              filters={filters}
              initialWishlistIds={books.filter((b) => wishlistIds.has(b.id)).map((b) => b.id)}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-24 text-center">
              <SearchX className="h-10 w-10 text-muted-foreground" />
              <p className="font-heading text-xl">No books found</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {q
                  ? `Nothing matched "${q}". Try a different title, author, or ISBN.`
                  : "Try widening the price range or clearing a filter."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
