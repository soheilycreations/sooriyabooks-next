import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SlideEditor, type SlideData } from "./slide-editor";

export default async function AdminHomepagePage() {
  await requireStaff();
  const supabase = await createClient();

  const { data: section } = await supabase.from("homepage_sections").select("id").eq("type", "hero_slider").maybeSingle();

  let slides: SlideData[] = [];
  if (section) {
    const { data: items } = await supabase
      .from("homepage_section_items")
      .select("id, heading, subheading, button_text, link_url, image_media_id, is_visible, starts_at, ends_at, media_assets ( storage_path )")
      .eq("section_id", section.id)
      .order("sort_order");

    slides = (items ?? []).map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const i = item as any;
      return {
        id: i.id,
        heading: i.heading ?? "",
        subheading: i.subheading,
        buttonText: i.button_text,
        linkUrl: i.link_url,
        imageMediaId: i.image_media_id,
        imageUrl: i.media_assets?.storage_path
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${i.media_assets.storage_path}`
          : null,
        isVisible: i.is_visible,
        startsAt: i.starts_at,
        endsAt: i.ends_at,
      };
    });
  }

  return (
    <div>
      <AdminPageHeader
        title="Homepage Banners"
        description="Manage hero slider banners: image, text, link, order, visibility, and schedule. The overall homepage layout is fixed and not editable here."
      />
      <SlideEditor slides={slides} />
    </div>
  );
}
