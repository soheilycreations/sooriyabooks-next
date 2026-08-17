import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AuthorForm } from "@/components/admin/author-form";

export default async function EditAuthorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data: author } = await supabase.from("authors").select("*").eq("id", id).maybeSingle();
  if (!author) notFound();

  return (
    <div>
      <AdminPageHeader title={`Edit: ${author.name}`} />
      <AuthorForm
        authorId={id}
        initial={{
          name: author.name,
          slug: author.slug,
          bio: author.bio ?? "",
          photoUrl: author.photo_url ?? "",
          isFeatured: author.is_featured,
          seoTitle: author.seo_title ?? "",
          seoDescription: author.seo_description ?? "",
        }}
      />
    </div>
  );
}
