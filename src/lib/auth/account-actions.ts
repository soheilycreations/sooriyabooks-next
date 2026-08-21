"use server";

import { getCurrentUser } from "@/lib/auth/session";

/** Thin server-action wrapper so the header's account drawer (a Client
 *  Component) can read the same session getCurrentUser() already exposes
 *  to Server Components — not a second auth check, just a callable entry
 *  point for it. */
export async function getAccountSummaryAction(): Promise<{ email: string } | null> {
  const user = await getCurrentUser();
  if (!user?.email) return null;
  return { email: user.email };
}
