import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CategoryForm } from "@/components/admin/category-form";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: category }, { data: categories }] = await Promise.all([
    supabase.from("categories").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  if (!category) notFound();

  return (
    <div>
      <AdminPageHeader title={`Edit: ${category.name}`} />
      <CategoryForm
        categoryId={id}
        parentOptions={categories ?? []}
        initial={{
          name: category.name,
          slug: category.slug,
          parentId: category.parent_id,
          description: category.description ?? "",
          imageUrl: category.image_url ?? "",
          sortOrder: category.sort_order,
          seoTitle: category.seo_title ?? "",
          seoDescription: category.seo_description ?? "",
        }}
      />
    </div>
  );
}
