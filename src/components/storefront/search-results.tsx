"use client";

import { useState, useTransition } from "react";
import { ProductCard } from "@/components/storefront/product-card";
import { Reveal } from "@/components/storefront/reveal";
import { Button } from "@/components/ui/button";
import { loadMoreBooksAction } from "@/lib/catalog/search-actions";
import type { BookCardData, SearchFilters } from "@/lib/catalog/queries";

const PAGE_SIZE = 24;

/**
 * Owns the accumulated result list client-side so "Load more" can append a
 * new page in place instead of navigating (the previous version was a plain
 * <Link href="?limit=...">, which reset scroll to the top on every click).
 * Filter/sort/search changes still go through a normal page navigation —
 * only pagination needed this.
 */
export function SearchResults({
  initialBooks,
  total,
  filters,
  initialWishlistIds,
}: {
  initialBooks: BookCardData[];
  total: number;
  filters: SearchFilters;
  initialWishlistIds: string[];
}) {
  const [books, setBooks] = useState(initialBooks);
  const [wishlistIds, setWishlistIds] = useState(() => new Set(initialWishlistIds));
  const [isPending, startTransition] = useTransition();

  // A real filter/sort/search change re-renders this component with a new
  // `initialBooks` array from the server — reset to that fresh set instead
  // of appending to (or leaving stale) results from the previous filter.
  // This is the React-documented pattern for syncing state to a changed
  // prop during render, not a useEffect, so there's no extra render/flash.
  const [trackedInitial, setTrackedInitial] = useState(initialBooks);
  if (initialBooks !== trackedInitial) {
    setTrackedInitial(initialBooks);
    setBooks(initialBooks);
    setWishlistIds(new Set(initialWishlistIds));
  }

  const hasMore = books.length < total;

  function loadMore() {
    startTransition(async () => {
      const result = await loadMoreBooksAction(filters, books.length, PAGE_SIZE);
      setBooks((prev) => [...prev, ...result.books]);
      setWishlistIds((prev) => new Set([...prev, ...result.wishlistIds]));
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
        {books.map((book, i) => (
          <Reveal key={book.id} index={i % 8}>
            <ProductCard book={book} showWishlist inWishlist={wishlistIds.has(book.id)} showQuickAdd />
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
