import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteAuthor } from "@/lib/catalog/actions";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Pencil } from "lucide-react";

export default async function AdminAuthorsPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data: authors } = await supabase.from("authors").select("id, name, slug, is_featured").order("name");

  return (
    <div>
      <AdminPageHeader title="Authors" actionLabel="New Author" actionHref="/admin/authors/new" />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(authors ?? []).map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.slug}</td>
                <td className="px-4 py-3">{a.is_featured && <Badge variant="accent">Featured</Badge>}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/authors/${a.id}`} className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <DeleteButton action={deleteAuthor.bind(null, a.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!authors || authors.length === 0) && <p className="p-8 text-center text-sm text-muted-foreground">No authors yet.</p>}
      </div>
    </div>
  );
}
