"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { verifyRecaptcha } from "@/lib/security/recaptcha";
import type { ActionResult } from "@/lib/auth/actions";

export async function submitReview(
  bookId: string,
  bookSlug: string,
  rating: number,
  title: string,
  body: string,
  recaptchaToken?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to leave a review" };
  if (rating < 1 || rating > 5) return { ok: false, error: "Rating must be between 1 and 5" };
  if (!(await verifyRecaptcha(recaptchaToken))) {
    return { ok: false, error: "Please complete the CAPTCHA verification" };
  }

  // Verified-purchase check: find this customer's most recent order_item
  // for this book, if any (does not need to be "delivered" — a confirmed
  // order is enough to badge as a verified purchase).
  const { data: orderItem } = await supabase
    .from("order_items")
    .select("id, orders!inner ( customer_id )")
    .eq("book_id", bookId)
    .eq("orders.customer_id", user.id)
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("reviews").upsert(
    {
      book_id: bookId,
      customer_id: user.id,
      order_item_id: orderItem?.id ?? null,
      rating,
      title: title || null,
      body: body || null,
      status: "pending",
    },
    { onConflict: "book_id,customer_id,order_item_id" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/book/${bookSlug}`);
  return { ok: true, data: undefined };
}

export async function moderateReview(reviewId: string, status: "approved" | "rejected"): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("reviews").update({ status }).eq("id", reviewId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/reviews");
  return { ok: true, data: undefined };
}

export async function replyToReview(reviewId: string, reply: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("reviews")
    .update({ staff_reply: reply, staff_replied_by: user!.id, staff_replied_at: new Date().toISOString() })
    .eq("id", reviewId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/reviews");
  return { ok: true, data: undefined };
}
