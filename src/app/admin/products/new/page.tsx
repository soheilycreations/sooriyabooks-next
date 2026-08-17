import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { BookForm } from "@/components/admin/book-form";

export default async function NewProductPage() {
  await requireStaff();
  const supabase = await createClient();
  const [{ data: authors }, { data: publishers }, { data: categories }] = await Promise.all([
    supabase.from("authors").select("id, name").order("name"),
    supabase.from("publishers").select("id, name").order("name"),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  return (
    <div>
      <AdminPageHeader title="New Product" />
      <BookForm authors={authors ?? []} publishers={publishers ?? []} categories={categories ?? []} />
    </div>
  );
}
