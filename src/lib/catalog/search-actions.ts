"use server";

import { searchBooksPreview } from "@/lib/catalog/queries";

/**
 * Thin server-action wrapper so the client-side search overlay can call the
 * exact same query the full /search page uses (searchBooksPreview, in
 * queries.ts) — not a second search backend, just a callable entry point
 * for a Client Component.
 */
export async function searchBooksAction(term: string) {
  return searchBooksPreview(term, 8);
}
