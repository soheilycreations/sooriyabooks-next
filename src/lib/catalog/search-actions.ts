"use server";

import { searchBooks, searchBooksPreview, getBooksByCategory, type SearchFilters, type BookCardData, type BookSort } from "@/lib/catalog/queries";
import { getWishlistBookIds } from "@/lib/customers/wishlist-actions";

/**
 * Thin server-action wrapper so the client-side search overlay can call the
 * exact same query the full /search page uses (searchBooksPreview, in
 * queries.ts) — not a second search backend, just a callable entry point
 * for a Client Component.
 */
export async function searchBooksAction(term: string) {
  return searchBooksPreview(term, 8);
}

/**
 * Fetches the next page of search results without a page navigation — the
 * previous "Load more" was a plain <Link>, which reset scroll position to
 * the top on every click. This runs from a client component instead, so
 * the new books can be appended to the existing grid in place.
 */
export async function loadMoreBooksAction(
  filters: SearchFilters,
  offset: number,
  limit: number,
): Promise<{ books: BookCardData[]; total: number; wishlistIds: string[] }> {
  const [{ books, total }, wishlistIds] = await Promise.all([searchBooks(filters, offset, limit), getWishlistBookIds()]);
  return { books, total, wishlistIds: books.filter((b) => wishlistIds.has(b.id)).map((b) => b.id) };
}

/**
 * Same "append in place" fix as loadMoreBooksAction, for category pages —
 * the previous "Load more" there was a plain <Link href="?limit=...">,
 * which on mobile browsers reset scroll to the top on every click.
 */
export async function loadMoreCategoryBooksAction(
  categorySlug: string,
  sort: BookSort,
  offset: number,
  limit: number,
): Promise<{ books: BookCardData[]; total: number; wishlistIds: string[] }> {
  const [{ books, total }, wishlistIds] = await Promise.all([
    getBooksByCategory(categorySlug, { offset, limit, sort }),
    getWishlistBookIds(),
  ]);
  return { books, total, wishlistIds: books.filter((b) => wishlistIds.has(b.id)).map((b) => b.id) };
}
