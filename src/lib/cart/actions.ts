"use server";

import { createClient } from "@/lib/supabase/server";

/** Current pre-discount selling price for a set of books — used to backfill
 * `originalPrice` on cart items that were added to a shopper's browser
 * before that field existed, so their savings can still be shown instead of
 * silently disappearing. */
export async function getOriginalPrices(bookIds: string[]): Promise<Record<string, number>> {
  if (bookIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("books").select("id, selling_price").in("id", bookIds);
  const result: Record<string, number> = {};
  for (const row of data ?? []) {
    result[row.id] = Number(row.selling_price);
  }
  return result;
}
