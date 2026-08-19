"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/lib/validation/auth";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

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

  // Blocked customers (generalizes the legacy "Blocked Users" rule) are
  // signed back out immediately rather than allowed to browse the account area.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_blocked, blocked_reason")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.is_blocked) {
    await supabase.auth.signOut();
    return { ok: false, error: profile.blocked_reason || "This account has been restricted." };
  }

  // Self-heal a missing profiles row: signUp() creates one, but any
  // auth.users row that didn't originate from this app's own registration
  // form (e.g. an account created directly in the Supabase Dashboard) has
  // none — and profiles.id is the FK target for addresses/orders/reviews/
  // wishlist, so checkout fails with a foreign-key violation the moment
  // such an account tries to save a delivery address. Upserting only
  // `id` here is a no-op for an existing row (no other column is touched)
  // and creates the missing row otherwise — same pattern signUp() already
  // uses, just applied at the other real session chokepoint.
  if (!profile) {
    await supabase.from("profiles").upsert({ id: data.user.id });
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
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
