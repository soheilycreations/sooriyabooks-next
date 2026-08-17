"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/auth/actions";

export interface BannerSlideInput {
  heading: string;
  subheading?: string;
  buttonText?: string;
  linkUrl?: string;
  imageMediaId: string | null;
  isVisible: boolean;
  startsAt?: string;
  endsAt?: string;
}

/**
 * Deliberately narrow: the admin panel only exposes hero-slider banner
 * management (this file), never a general homepage layout/section builder —
 * that's a product decision, not a technical limitation of the schema.
 */
async function getHeroSliderSectionId(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("homepage_sections").select("id").eq("type", "hero_slider").maybeSingle();
  if (data) return data.id;
  const { data: created } = await supabase
    .from("homepage_sections")
    .insert({ type: "hero_slider", title: "Hero Slider", sort_order: 1 })
    .select("id")
    .single();
  return created!.id;
}

export async function createBannerSlide(input: BannerSlideInput): Promise<ActionResult<{ id: string }>> {
  await requireStaff();
  const supabase = await createClient();
  const sectionId = await getHeroSliderSectionId();

  const { count } = await supabase
    .from("homepage_section_items")
    .select("*", { count: "exact", head: true })
    .eq("section_id", sectionId);

  const { data: item, error } = await supabase
    .from("homepage_section_items")
    .insert({
      section_id: sectionId,
      heading: input.heading,
      subheading: input.subheading || null,
      button_text: input.buttonText || null,
      link_url: input.linkUrl || null,
      image_media_id: input.imageMediaId,
      is_visible: input.isVisible,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();

  if (error || !item) return { ok: false, error: error?.message || "Could not create slide" };
  revalidateTag("homepage");
  revalidatePath("/admin/homepage");
  revalidatePath("/");
  return { ok: true, data: { id: item.id } };
}

export async function updateBannerSlide(id: string, input: BannerSlideInput): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("homepage_section_items")
    .update({
      heading: input.heading,
      subheading: input.subheading || null,
      button_text: input.buttonText || null,
      link_url: input.linkUrl || null,
      image_media_id: input.imageMediaId,
      is_visible: input.isVisible,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateTag("homepage");
  revalidatePath("/admin/homepage");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function deleteBannerSlide(id: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("homepage_section_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateTag("homepage");
  revalidatePath("/admin/homepage");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function reorderBannerSlide(id: string, direction: "up" | "down"): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { data: current } = await supabase.from("homepage_section_items").select("id, section_id, sort_order").eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "Slide not found" };

  const { data: neighbor } = await supabase
    .from("homepage_section_items")
    .select("id, sort_order")
    .eq("section_id", current.section_id)
    .order("sort_order", { ascending: direction === "up" ? false : true })
    .lt("sort_order", direction === "up" ? current.sort_order : Number.MAX_SAFE_INTEGER)
    .gt("sort_order", direction === "down" ? current.sort_order : -1)
    .limit(1)
    .maybeSingle();

  if (!neighbor) return { ok: true, data: undefined }; // already at the edge

  await supabase.from("homepage_section_items").update({ sort_order: neighbor.sort_order }).eq("id", current.id);
  await supabase.from("homepage_section_items").update({ sort_order: current.sort_order }).eq("id", neighbor.id);

  revalidateTag("homepage");
  revalidatePath("/admin/homepage");
  revalidatePath("/");
  return { ok: true, data: undefined };
}
