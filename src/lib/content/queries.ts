import { createClient } from "@/lib/supabase/server";

export interface HeroSlide {
  id: string;
  heading: string;
  subheading: string | null;
  buttonText: string | null;
  linkUrl: string | null;
  imageUrl: string | null;
}

/** Live hero slides: visible flag + inside the optional schedule window. */
export async function getActiveHeroSlides(): Promise<HeroSlide[]> {
  const supabase = await createClient();
  const { data: section } = await supabase.from("homepage_sections").select("id").eq("type", "hero_slider").maybeSingle();
  if (!section) return [];

  const nowIso = new Date().toISOString();
  const { data: items } = await supabase
    .from("homepage_section_items")
    .select("id, heading, subheading, button_text, link_url, starts_at, ends_at, media_assets ( storage_path )")
    .eq("section_id", section.id)
    .eq("is_visible", true)
    .order("sort_order");

  return (items ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((i: any) => (!i.starts_at || i.starts_at <= nowIso) && (!i.ends_at || i.ends_at >= nowIso))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((i: any) => ({
      id: i.id,
      heading: i.heading ?? "",
      subheading: i.subheading,
      buttonText: i.button_text,
      linkUrl: i.link_url,
      imageUrl: i.media_assets?.storage_path
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${i.media_assets.storage_path}`
        : null,
    }));
}
