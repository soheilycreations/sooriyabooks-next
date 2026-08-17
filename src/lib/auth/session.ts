import "server-only";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = "admin" | "manager" | "editor";

/** Current authenticated user, or null. Safe to call from any Server Component/Action. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Current user's staff role, or null if they're a customer / unauthenticated. */
export async function getStaffRole(): Promise<StaffRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("staff_members")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return (data?.role as StaffRole | undefined) ?? null;
}

/**
 * Throws if the current user isn't staff. Call at the top of every admin
 * Server Component/Action — RLS is the real enforcement layer, this just
 * fails fast with a clear error instead of an empty/confusing query result.
 */
export async function requireStaff(minRole?: StaffRole[]) {
  const role = await getStaffRole();
  if (!role) {
    throw new Error("Not authorized: staff access required");
  }
  if (minRole && !minRole.includes(role)) {
    throw new Error(`Not authorized: requires role ${minRole.join(" or ")}`);
  }
  return role;
}
