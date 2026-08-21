"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/auth/actions";
import { BOOK_CARD_SELECT_WITH_STOCK, mapBookRowToCard, type BookCardData } from "@/lib/catalog/queries";

export async function toggleWishlist(bookId: string): Promise<ActionResult<{ inWishlist: boolean }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to save items to your wishlist" };

  const { data: existing } = await supabase
    .from("wishlist_items")
    .select("book_id")
    .eq("customer_id", user.id)
    .eq("book_id", bookId)
    .maybeSingle();

  if (existing) {
    await supabase.from("wishlist_items").delete().eq("customer_id", user.id).eq("book_id", bookId);
    revalidatePath("/account/wishlist");
    return { ok: true, data: { inWishlist: false } };
  }

  const { error } = await supabase.from("wishlist_items").insert({ customer_id: user.id, book_id: bookId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/account/wishlist");
  return { ok: true, data: { inWishlist: true } };
}

/** Bulk lookup for rendering initial wishlist state across a grid of cards without one query per card. */
export async function getWishlistBookIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase.from("wishlist_items").select("book_id").eq("customer_id", user.id);
  return new Set((data ?? []).map((row) => row.book_id));
}

export async function isInWishlist(bookId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("wishlist_items").select("book_id").eq("customer_id", user.id).eq("book_id", bookId).maybeSingle();
  return !!data;
}

/**
 * Full book cards for the header's wishlist drawer — same
 * wishlist_items -> books join the /account/wishlist page already uses,
 * exposed as a callable action so a Client Component can fetch it.
 * `authenticated: false` (vs. an empty `books` array) is how the drawer
 * tells "you have no saved books" apart from "you're not signed in".
 */
export async function getWishlistBooks(): Promise<{ authenticated: boolean; books: BookCardData[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { authenticated: false, books: [] };

  const { data } = await supabase
    .from("wishlist_items")
    .select(`book_id, books ( ${BOOK_CARD_SELECT_WITH_STOCK} )`)
    .eq("customer_id", user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const books = (data ?? []).map((row: any) => row.books).filter(Boolean).map(mapBookRowToCard);
  return { authenticated: true, books };
}

export async function removeFromWishlist(bookId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const { error } = await supabase.from("wishlist_items").delete().eq("customer_id", user.id).eq("book_id", bookId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/account/wishlist");
  return { ok: true, data: undefined };
}
