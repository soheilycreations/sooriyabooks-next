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

  const { data: inventory } = await supabase
    .from("inventory")
    .select("quantity_on_hand, stock_tracking_enabled")
    .eq("book_id", bookId)
    .maybeSingle();

  if (inventory && !inventory.stock_tracking_enabled) {
    return {
      ok: false,
      error: "Stock tracking is off for this product — enable tracking first (with a real starting quantity) before making adjustments.",
    };
  }

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

/**
 * Switches a product between tracked (real numeric stock, enforced at
 * checkout) and untracked (sellable/unavailable flag only, no quantity
 * enforcement — see supabase/migrations/0011-0012 for why this exists:
 * most migrated WordPress products never had a real stock count).
 *
 * Enabling tracking REQUIRES a real starting quantity from the admin —
 * this action will never fabricate one.
 */
export async function setStockTracking(
  bookId: string,
  params: { trackingEnabled: boolean; quantityOnHand?: number; untrackedAvailable?: boolean; lowStockThreshold?: number },
): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  if (params.trackingEnabled) {
    if (params.quantityOnHand == null || params.quantityOnHand < 0) {
      return { ok: false, error: "Enter a real starting quantity to enable stock tracking" };
    }
  }

  const update: {
    book_id: string;
    stock_tracking_enabled: boolean;
    quantity_on_hand?: number;
    untracked_available?: boolean;
    low_stock_threshold?: number;
  } = { book_id: bookId, stock_tracking_enabled: params.trackingEnabled };

  if (params.trackingEnabled) {
    update.quantity_on_hand = params.quantityOnHand;
  } else if (params.untrackedAvailable != null) {
    update.untracked_available = params.untrackedAvailable;
  }
  if (params.lowStockThreshold != null) {
    update.low_stock_threshold = params.lowStockThreshold;
  }

  const { error } = await supabase.from("inventory").upsert(update);
  if (error) return { ok: false, error: error.message };

  const { data: auth } = await supabase.auth.getUser();
  await logAudit({ actorId: auth.user!.id, action: "inventory.set_tracking", entityType: "book", entityId: bookId, after: params });

  revalidatePath("/admin/inventory");
  return { ok: true, data: undefined };
}
