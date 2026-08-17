"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { logAudit } from "@/lib/admin/audit";
import type { ActionResult } from "@/lib/auth/actions";

export async function adjustStock(bookId: string, delta: number, reason: string): Promise<ActionResult> {
  await requireStaff();
  if (delta === 0) return { ok: false, error: "Adjustment must be non-zero" };
  const supabase = await createClient();

  const { data: inventory } = await supabase.from("inventory").select("quantity_on_hand").eq("book_id", bookId).maybeSingle();
  const newQuantity = (inventory?.quantity_on_hand ?? 0) + delta;
  if (newQuantity < 0) return { ok: false, error: "Adjustment would result in negative stock" };

  const { error } = await supabase.from("inventory").upsert({ book_id: bookId, quantity_on_hand: newQuantity });
  if (error) return { ok: false, error: error.message };

  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("stock_movements").insert({
    book_id: bookId,
    movement_type: "manual_adjustment",
    quantity_delta: delta,
    note: reason || null,
    performed_by: auth.user!.id,
  });
  await logAudit({ actorId: auth.user!.id, action: "inventory.adjust", entityType: "book", entityId: bookId, after: { delta, reason } });

  revalidatePath("/admin/inventory");
  return { ok: true, data: undefined };
}

export async function setLowStockThreshold(bookId: string, threshold: number): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("inventory").upsert({ book_id: bookId, low_stock_threshold: threshold });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/inventory");
  return { ok: true, data: undefined };
}
