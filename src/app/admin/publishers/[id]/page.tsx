import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PublisherForm } from "@/components/admin/publisher-form";

export default async function EditPublisherPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data: publisher } = await supabase.from("publishers").select("*").eq("id", id).maybeSingle();
  if (!publisher) notFound();

  return (
    <div>
      <AdminPageHeader title={`Edit: ${publisher.name}`} />
      <PublisherForm
        publisherId={id}
        initial={{
          name: publisher.name,
          slug: publisher.slug,
          description: publisher.description ?? "",
          logoUrl: publisher.logo_url ?? "",
          isFeatured: publisher.is_featured,
          seoTitle: publisher.seo_title ?? "",
          seoDescription: publisher.seo_description ?? "",
        }}
      />
    </div>
  );
}
