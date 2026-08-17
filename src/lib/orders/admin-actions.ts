"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { logAudit } from "@/lib/admin/audit";
import type { ActionResult } from "@/lib/auth/actions";
import type { Database } from "@/types/database";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export async function updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { data: before } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();

  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("order_status_history").insert({ order_id: orderId, status, note: note || null, changed_by: auth.user!.id });
  await logAudit({ actorId: auth.user!.id, action: "order.status_change", entityType: "order", entityId: orderId, before, after: { status } });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, data: undefined };
}

export async function addOrderAdminNote(orderId: string, note: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ admin_note: note }).eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, data: undefined };
}
