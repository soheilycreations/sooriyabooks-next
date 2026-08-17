import Link from "next/link";
import { Pencil } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { Badge } from "@/components/ui/badge";
import { deleteBook } from "@/lib/catalog/actions";
import { formatCurrency, sanitizeSearchTerm } from "@/lib/utils";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireStaff();
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("books")
    .select("id, title, sku, selling_price, discount_price, is_active, is_featured, authors ( name ), inventory ( quantity_on_hand, quantity_reserved )")
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    const term = sanitizeSearchTerm(q);
    if (term) query = query.or(`title.ilike.%${term}%,sku.ilike.%${term}%,isbn.ilike.%${term}%`);
  }

  const { data: books } = await query;

  return (
    <div>
      <AdminPageHeader title="Products" actionLabel="New Product" actionHref="/admin/products/new" />
      <form className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by title, SKU, or ISBN..."
          className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm"
        />
      </form>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(books ?? []).map((book: any) => {
              const stock = (book.inventory?.quantity_on_hand ?? 0) - (book.inventory?.quantity_reserved ?? 0);
              return (
                <tr key={book.id} className="border-t">
                  <td className="max-w-xs truncate px-4 py-3 font-medium">{book.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{book.sku}</td>
                  <td className="px-4 py-3 text-muted-foreground">{book.authors?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {book.discount_price ? (
                      <>
                        <span className="text-accent">{formatCurrency(Number(book.discount_price))}</span>{" "}
                        <span className="text-xs text-muted-foreground line-through">{formatCurrency(Number(book.selling_price))}</span>
                      </>
                    ) : (
                      formatCurrency(Number(book.selling_price))
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {stock <= 0 ? (
                      <Badge variant="destructive">Out of stock</Badge>
                    ) : stock <= 5 ? (
                      <Badge variant="secondary">{stock} low</Badge>
                    ) : (
                      stock
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {book.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Draft</Badge>}
                      {book.is_featured && <Badge variant="accent">Featured</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/products/${book.id}`} className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <DeleteButton action={deleteBook.bind(null, book.id)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!books || books.length === 0) && <p className="p-8 text-center text-sm text-muted-foreground">No products found.</p>}
      </div>
    </div>
  );
}
