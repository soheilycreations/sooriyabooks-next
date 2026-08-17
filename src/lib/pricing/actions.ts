"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { logAudit } from "@/lib/admin/audit";
import { couponSchema, type CouponInput } from "@/lib/validation/coupon";
import type { ActionResult } from "@/lib/auth/actions";

export async function createCoupon(input: CouponInput): Promise<ActionResult<{ id: string }>> {
  await requireStaff();
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  const supabase = await createClient();

  const { data: coupon, error } = await supabase
    .from("coupons")
    .insert({
      code: d.code,
      type: d.type,
      value: d.value,
      scope: d.scope,
      minimum_order_amount: d.minimumOrderAmount,
      usage_limit: d.usageLimit ?? null,
      per_customer_limit: d.perCustomerLimit ?? null,
      starts_at: d.startsAt || null,
      expires_at: d.expiresAt || null,
      is_active: d.isActive,
    })
    .select("id")
    .single();

  if (error || !coupon) return { ok: false, error: error?.message || "Could not create coupon" };

  if (d.scope === "book" && d.bookIds.length > 0) {
    await supabase.from("coupon_books").insert(d.bookIds.map((bookId) => ({ coupon_id: coupon.id, book_id: bookId })));
  }
  if (d.scope === "category" && d.categoryIds.length > 0) {
    await supabase.from("coupon_categories").insert(d.categoryIds.map((categoryId) => ({ coupon_id: coupon.id, category_id: categoryId })));
  }

  const { data: auth } = await supabase.auth.getUser();
  await logAudit({ actorId: auth.user!.id, action: "coupon.create", entityType: "coupon", entityId: coupon.id, after: d });

  revalidatePath("/admin/coupons");
  return { ok: true, data: { id: coupon.id } };
}

export async function updateCoupon(id: string, input: CouponInput): Promise<ActionResult> {
  await requireStaff();
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("coupons")
    .update({
      code: d.code,
      type: d.type,
      value: d.value,
      scope: d.scope,
      minimum_order_amount: d.minimumOrderAmount,
      usage_limit: d.usageLimit ?? null,
      per_customer_limit: d.perCustomerLimit ?? null,
      starts_at: d.startsAt || null,
      expires_at: d.expiresAt || null,
      is_active: d.isActive,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await supabase.from("coupon_books").delete().eq("coupon_id", id);
  await supabase.from("coupon_categories").delete().eq("coupon_id", id);
  if (d.scope === "book" && d.bookIds.length > 0) {
    await supabase.from("coupon_books").insert(d.bookIds.map((bookId) => ({ coupon_id: id, book_id: bookId })));
  }
  if (d.scope === "category" && d.categoryIds.length > 0) {
    await supabase.from("coupon_categories").insert(d.categoryIds.map((categoryId) => ({ coupon_id: id, category_id: categoryId })));
  }

  revalidatePath("/admin/coupons");
  return { ok: true, data: undefined };
}

export async function deleteCoupon(id: string): Promise<ActionResult> {
  await requireStaff(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/coupons");
  return { ok: true, data: undefined };
}
