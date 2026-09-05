import Link from "next/link";
import Image from "next/image";
import { Pencil, ImageOff } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { Badge } from "@/components/ui/badge";
import { deleteBook } from "@/lib/catalog/actions";
import { resolveCoverUrl } from "@/lib/catalog/queries";
import { formatCurrency, sanitizeSearchTerm } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function primaryCoverUrl(book: any): string | null {
  const images = book.book_images ?? [];
  const primary = [...images].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  )[0];
  return resolveCoverUrl(primary?.media_assets?.storage_path ?? null);
}

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
    .select(
      `id, title, sku, selling_price, discount_price, is_active, is_featured,
       authors ( name ), inventory ( quantity_on_hand, quantity_reserved, stock_tracking_enabled, untracked_available ),
       book_images ( is_primary, sort_order, media_assets ( storage_path ) )`,
    )
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
              <th className="px-4 py-3" />
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
              const tracked = book.inventory?.stock_tracking_enabled ?? true;
              const stock = (book.inventory?.quantity_on_hand ?? 0) - (book.inventory?.quantity_reserved ?? 0);
              const coverUrl = primaryCoverUrl(book);
              return (
                <tr key={book.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-sm bg-secondary">
                      {coverUrl ? (
                        <Image src={coverUrl} alt="" fill sizes="40px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </td>
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
                    {tracked ? (
                      stock <= 0 ? (
                        <Badge variant="destructive">Out of stock</Badge>
                      ) : stock <= 5 ? (
                        <Badge variant="secondary">{stock} low</Badge>
                      ) : (
                        stock
                      )
                    ) : book.inventory?.untracked_available ? (
                      <Badge variant="outline">Untracked</Badge>
                    ) : (
                      <Badge variant="destructive">Untracked — Out</Badge>
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
