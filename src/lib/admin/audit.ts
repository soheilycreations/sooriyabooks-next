import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Records a staff mutation to `audit_logs`. Best-effort: a logging failure
 * should never block the actual mutation, so errors are swallowed (and
 * would show up in `system_logs`/Vercel logs in a future hardening pass).
 */
export async function logAudit(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("audit_logs").insert({
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      before_data: params.before ? JSON.parse(JSON.stringify(params.before)) : null,
      after_data: params.after ? JSON.parse(JSON.stringify(params.after)) : null,
    });
  } catch {
    // Non-fatal — see comment above.
  }
}
