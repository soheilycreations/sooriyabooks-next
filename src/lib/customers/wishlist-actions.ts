"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/auth/actions";

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

export async function isInWishlist(bookId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("wishlist_items").select("book_id").eq("customer_id", user.id).eq("book_id", bookId).maybeSingle();
  return !!data;
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
