import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Server Component / Server Action Supabase client. RLS-scoped to the
 * current user's session — never use the service-role key here.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  // @supabase/ssr's createServerClient() still types its return value using
  // an older 3-parameter SupabaseClient<Database, SchemaName, Schema> shape
  // that predates the 4-parameter generic signature in the currently
  // installed @supabase/supabase-js — an upstream version-skew between the
  // two packages' published types, not a bug in this codebase (confirmed by
  // inspecting both packages' .d.ts directly; @supabase/ssr has not caught
  // up as of its latest release). The runtime object is a perfectly normal
  // Supabase client either way, so this cast is safe: it only reconciles two
  // structurally-equivalent-at-runtime type declarations that disagree.
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component; middleware refreshes the
            // session instead. Safe to ignore.
          }
        },
      },
    },
  ) as unknown as SupabaseClient<Database>;
}

/**
 * Service-role client for trusted server-only operations that must bypass
 * RLS (webhook handlers, ETL scripts). Never import this into anything
 * reachable from client code.
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
