"use client";

import { useState, useTransition } from "react";
import { ProductCard } from "@/components/storefront/product-card";
import { Reveal } from "@/components/storefront/reveal";
import { Button } from "@/components/ui/button";
import { loadMoreCategoryBooksAction } from "@/lib/catalog/search-actions";
import type { BookCardData, BookSort } from "@/lib/catalog/queries";

const PAGE_SIZE = 24;

/**
 * Owns the accumulated result list client-side so "Load more" can append a
 * new page in place instead of navigating — the previous version was a
 * plain <Link href="?limit=...">, which on mobile browsers reset scroll to
 * the top on every click (same fix as /search's SearchResults).
 */
export function CategoryResults({
  categorySlug,
  sort,
  initialBooks,
  total,
  initialWishlistIds,
}: {
  categorySlug: string;
  sort: BookSort;
  initialBooks: BookCardData[];
  total: number;
  initialWishlistIds: string[];
}) {
  const [books, setBooks] = useState(initialBooks);
  const [wishlistIds, setWishlistIds] = useState(() => new Set(initialWishlistIds));
  const [isPending, startTransition] = useTransition();

  // A real sort change re-renders this component with a new `initialBooks`
  // array from the server — reset to that fresh set instead of appending to
  // (or leaving stale) results from the previous sort. React-documented
  // pattern for syncing state to a changed prop during render.
  const [trackedInitial, setTrackedInitial] = useState(initialBooks);
  if (initialBooks !== trackedInitial) {
    setTrackedInitial(initialBooks);
    setBooks(initialBooks);
    setWishlistIds(new Set(initialWishlistIds));
  }

  const hasMore = books.length < total;

  function loadMore() {
    startTransition(async () => {
      const result = await loadMoreCategoryBooksAction(categorySlug, sort, books.length, PAGE_SIZE);
      setBooks((prev) => [...prev, ...result.books]);
      setWishlistIds((prev) => new Set([...prev, ...result.wishlistIds]));
    });
  }

  return (
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
          <Button variant="outline" size="lg" onClick={loadMore} disabled={isPending}>
            {isPending ? "Loading..." : "Load more books"}
          </Button>
        </div>
      )}
    </>
  );
}
