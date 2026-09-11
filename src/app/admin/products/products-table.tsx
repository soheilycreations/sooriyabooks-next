"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Pencil, ImageOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { BarcodeScannerButton } from "@/components/admin/barcode-scanner-button";
import { deleteBook, searchAdminProducts, type AdminProductRow } from "@/lib/catalog/actions";
import { resolveCoverUrl } from "@/lib/catalog/queries";
import { formatCurrency } from "@/lib/utils";

function primaryCoverUrl(book: AdminProductRow): string | null {
  const images = book.book_images ?? [];
  const primary = [...images].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  )[0];
  return resolveCoverUrl(primary?.media_assets?.storage_path ?? null);
}

/**
 * Search box + results table as one live-search unit: typing debounces
 * (250ms, same pattern as the storefront's SearchOverlay) into
 * searchAdminProducts() and swaps the table in place — no more submitting
 * the form and waiting on a full page reload to see matches. A barcode
 * scan searches immediately, skipping the debounce.
 */
export function ProductsTable({
  initialBooks,
  initialQuery,
}: {
  initialBooks: AdminProductRow[];
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [books, setBooks] = useState(initialBooks);
  const [isPending, startTransition] = useTransition();

  // Keeps this in sync if the server re-renders with fresh data (e.g.
  // DeleteButton's router.refresh() re-fetching the page) — the
  // React-documented pattern for syncing state to a changed prop during
  // render, not a useEffect, so there's no extra render/flash.
  const [trackedInitial, setTrackedInitial] = useState(initialBooks);
  if (initialBooks !== trackedInitial) {
    setTrackedInitial(initialBooks);
    setBooks(initialBooks);
  }

  function runSearch(term: string) {
    startTransition(async () => {
      const results = await searchAdminProducts(term);
      setBooks(results);
    });
  }

  useEffect(() => {
    const id = setTimeout(() => runSearch(query), 250);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <div>
      <div className="mb-4 flex max-w-sm gap-2">
        <div className="relative flex-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, SKU, or ISBN..."
            className="h-10 w-full rounded-md border border-input bg-background px-3 pr-8 text-sm"
          />
          {isPending && (
            <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <BarcodeScannerButton
          label="Scan ISBN barcode"
          onScan={(text) => {
            setQuery(text);
            runSearch(text);
          }}
        />
      </div>
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
            {books.map((book) => {
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
                        <span className="text-xs text-muted-foreground line-through">
                          {formatCurrency(Number(book.selling_price))}
                        </span>
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
                      <Link
                        href={`/admin/products/${book.id}`}
                        className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <DeleteButton
                        action={deleteBook.bind(null, book.id)}
                        onDeleted={() => setBooks((prev) => prev.filter((b) => b.id !== book.id))}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {books.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No products found.</p>}
      </div>
    </div>
  );
}
