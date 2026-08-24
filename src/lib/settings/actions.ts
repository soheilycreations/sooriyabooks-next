"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { siteSettingsSchema, type SiteSettingsInput } from "@/lib/validation/site-settings";
import type { ActionResult } from "@/lib/auth/actions";

export interface SiteSettings {
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  telegramUrl: string;
  whatsappUrl: string;
}

/**
 * Public read — the footer and the floating WhatsApp button (both rendered
 * for every visitor, from the storefront layout and Footer independently)
 * need this without requiring staff auth. Wrapped in React's cache() so
 * both call sites within the same request share one query.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("facebook_url, instagram_url, twitter_url, youtube_url, telegram_url, whatsapp_url")
    .limit(1)
    .maybeSingle();

  return {
    facebookUrl: data?.facebook_url ?? "",
    instagramUrl: data?.instagram_url ?? "",
    twitterUrl: data?.twitter_url ?? "",
    youtubeUrl: data?.youtube_url ?? "",
    telegramUrl: data?.telegram_url ?? "",
    whatsappUrl: data?.whatsapp_url ?? "",
  };
});

export async function updateSiteSettings(input: SiteSettingsInput): Promise<ActionResult> {
  await requireStaff();
  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  const supabase = await createClient();

  // Singleton row — the migration seeds exactly one, so always update the
  // first (only) one rather than tracking its id through the form.
  const { data: existing } = await supabase.from("site_settings").select("id").limit(1).maybeSingle();
  if (!existing) return { ok: false, error: "Site settings row is missing — check the site_settings migration ran." };

  const { error } = await supabase
    .from("site_settings")
    .update({
      facebook_url: d.facebookUrl || null,
      instagram_url: d.instagramUrl || null,
      twitter_url: d.twitterUrl || null,
      youtube_url: d.youtubeUrl || null,
      telegram_url: d.telegramUrl || null,
      whatsapp_url: d.whatsappUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) return { ok: false, error: error.message };

  // Every page renders the footer, so bust the whole app rather than one route.
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
