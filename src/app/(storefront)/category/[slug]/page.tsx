import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/storefront/product-card";
import { SortSelect } from "@/components/storefront/sort-select";
import { Reveal } from "@/components/storefront/reveal";
import { getBooksByCategory, type BookSort } from "@/lib/catalog/queries";
import { getWishlistBookIds } from "@/lib/customers/wishlist-actions";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 3600;

const PAGE_SIZE = 24;

async function getCategory(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description, seo_title, seo_description")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return {};
  return {
    title: category.seo_title || category.name,
    description: category.seo_description || category.description || undefined,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; limit?: string }>;
}) {
  const { slug } = await params;
  const { sort: sortParam, limit: limitParam } = await searchParams;
  const category = await getCategory(slug);
  if (!category) notFound();

  const sort: BookSort = sortParam === "price_asc" || sortParam === "price_desc" ? sortParam : "newest";
  const limit = Math.max(PAGE_SIZE, Number(limitParam) || PAGE_SIZE);

  const [{ books, total }, wishlistIds] = await Promise.all([
    getBooksByCategory(slug, { limit, sort }),
    getWishlistBookIds(),
  ]);

  const hasMore = books.length < total;
  const params2 = new URLSearchParams();
  if (sortParam) params2.set("sort", sortParam);
  params2.set("limit", String(limit + PAGE_SIZE));

  return (
    <div className="container py-12 md:py-16">
      <div className="mb-8 flex flex-col gap-4 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl leading-tight md:text-4xl md:leading-tight">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {total} {total === 1 ? "book" : "books"}
          </p>
        </div>
        {books.length > 0 && <SortSelect />}
      </div>

      {books.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {books.map((book, i) => (
              <Reveal key={book.id} index={i % 8}>
                <ProductCard book={book} showWishlist inWishlist={wishlistIds.has(book.id)} />
              </Reveal>
            ))}
          </div>
          {hasMore && (
            <div className="mt-12 text-center">
              <Link
                href={`?${params2.toString()}`}
                className="inline-flex h-11 items-center justify-center rounded-md border border-input px-6 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Load more books
              </Link>
            </div>
          )}
        </>
      ) : (
        <p className="py-12 text-center text-muted-foreground">No books in this category yet.</p>
      )}
    </div>
  );
}
