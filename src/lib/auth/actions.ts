"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/lib/validation/auth";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Shared post-authentication rules, applied after ANY sign-in method
 * (password or Google) establishes a Supabase session — never just at the
 * password form. Blocked customers (generalizes the legacy "Blocked Users"
 * rule) are signed back out immediately rather than allowed to browse the
 * account area, and a missing `profiles` row is self-healed: it's the FK
 * target for addresses/orders/reviews/wishlist, so checkout fails with a
 * foreign-key violation the moment such an account tries to save a
 * delivery address — this can happen for a Google account exactly the same
 * way it could for a Dashboard-created one.
 */
async function runPostSignInChecks(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ActionResult> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_blocked, blocked_reason")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.is_blocked) {
    await supabase.auth.signOut();
    return { ok: false, error: profile.blocked_reason || "This account has been restricted." };
  }

  if (!profile) {
    await supabase.from("profiles").upsert({ id: userId });
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function signIn(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", fieldErrors: flattenZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { ok: false, error: error.message };
  }

  return runPostSignInChecks(supabase, data.user.id);
}

/**
 * Called after Google One Tap / the Google button already established a
 * Supabase session client-side via signInWithIdToken() — this just applies
 * the same blocked-check + profile self-heal the password flow gets,
 * against the session cookie the client-side call already set. Not a
 * second auth system: Supabase Auth is still the only thing issuing
 * sessions here, this is only where the app's own post-auth rules hook in.
 */
export async function completeSocialSignIn(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  return runPostSignInChecks(supabase, user.id);
}

export async function signUp(input: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", fieldErrors: flattenZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
    });
    if (profileError) {
      // Never fail silently here — a missing profiles row is exactly what
      // causes checkout's addresses_customer_id_fkey violation later. The
      // auth account itself was already created successfully at this
      // point, so this is logged rather than failing the whole signup.
      console.error("signUp: failed to create profiles row:", profileError.message, "for user", data.user.id);
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

function flattenZodErrors(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
