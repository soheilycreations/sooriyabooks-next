import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CategoryForm } from "@/components/admin/category-form";

export default async function NewCategoryPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("id, name").order("name");

  return (
    <div>
      <AdminPageHeader title="New Category" />
      <CategoryForm parentOptions={categories ?? []} />
    </div>
  );
}
