"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { logAudit } from "@/lib/admin/audit";
import type { ActionResult } from "@/lib/auth/actions";

export async function blockCustomer(customerId: string, reason: string): Promise<ActionResult> {
  await requireStaff(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_blocked: true, blocked_reason: reason || "Blocked by admin" })
    .eq("id", customerId);
  if (error) return { ok: false, error: error.message };

  const { data: auth } = await supabase.auth.getUser();
  await logAudit({ actorId: auth.user!.id, action: "customer.block", entityType: "profile", entityId: customerId, after: { reason } });

  revalidatePath("/admin/customers");
  return { ok: true, data: undefined };
}

export async function unblockCustomer(customerId: string): Promise<ActionResult> {
  await requireStaff(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_blocked: false, blocked_reason: null }).eq("id", customerId);
  if (error) return { ok: false, error: error.message };

  const { data: auth } = await supabase.auth.getUser();
  await logAudit({ actorId: auth.user!.id, action: "customer.unblock", entityType: "profile", entityId: customerId });

  revalidatePath("/admin/customers");
  return { ok: true, data: undefined };
}
