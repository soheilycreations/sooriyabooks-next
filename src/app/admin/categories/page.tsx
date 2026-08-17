import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteCategory } from "@/lib/catalog/actions";
import Link from "next/link";
import { Pencil } from "lucide-react";

export default async function AdminCategoriesPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, sort_order")
    .order("sort_order");

  return (
    <div>
      <AdminPageHeader title="Categories" actionLabel="New Category" actionHref="/admin/categories/new" />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Parent</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(categories ?? []).map((cat) => (
              <tr key={cat.id} className="border-t">
                <td className="px-4 py-3 font-medium">{cat.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{cat.slug}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {categories?.find((c) => c.id === cat.parent_id)?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{cat.sort_order}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/admin/categories/${cat.id}`}
                      className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <DeleteButton action={deleteCategory.bind(null, cat.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!categories || categories.length === 0) && (
          <p className="p-8 text-center text-sm text-muted-foreground">No categories yet.</p>
        )}
      </div>
    </div>
  );
}
