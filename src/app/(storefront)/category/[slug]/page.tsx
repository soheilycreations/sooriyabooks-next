import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SortSelect } from "@/components/storefront/sort-select";
import { getBooksByCategory, getAllCategories, type BookSort } from "@/lib/catalog/queries";
import { getWishlistBookIds } from "@/lib/customers/wishlist-actions";
import { createClient } from "@/lib/supabase/server";
import { decodeHtmlEntities } from "@/lib/utils";
import { CategoryResults } from "./category-results";

export const revalidate = 3600;

const PAGE_SIZE = 24;

async function getCategory(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description, seo_title, seo_description, parent_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return data;
  return { ...data, name: decodeHtmlEntities(data.name), description: data.description ? decodeHtmlEntities(data.description) : data.description };
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
  searchParams: Promise<{ sort?: string }>;
}) {
  const { slug } = await params;
  const { sort: sortParam } = await searchParams;
  const category = await getCategory(slug);
  if (!category) notFound();

  const sort: BookSort = sortParam === "price_asc" || sortParam === "price_desc" ? sortParam : "newest";

  const [{ books, total }, wishlistIds, allCategories] = await Promise.all([
    getBooksByCategory(slug, { limit: PAGE_SIZE, sort }),
    getWishlistBookIds(),
    getAllCategories(),
  ]);

  // Sub-categories only ever contain books directly tagged with THAT child
  // category (getBooksByCategory filters on the exact category id, never
  // inherits from children) — so without this, a parent like "Sooriya
  // Books" with a "Translations" child has no way for a visitor to
  // discover the child at all. Breadcrumb covers the reverse direction.
  const subCategories = allCategories.filter((c) => c.parent_id === category.id);
  const parentCategory = category.parent_id ? allCategories.find((c) => c.id === category.parent_id) : null;

  return (
    <div className="container py-12 md:py-16">
      {parentCategory && (
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link href={`/category/${parentCategory.slug}`} className="hover:text-foreground hover:underline">
            {decodeHtmlEntities(parentCategory.name)}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{category.name}</span>
        </nav>
      )}

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

      {subCategories.length > 0 && (
        <div className="mb-10 flex flex-wrap gap-2">
          {subCategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/category/${sub.slug}`}
              className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm transition-colors hover:border-accent hover:text-accent"
            >
              {decodeHtmlEntities(sub.name)}
            </Link>
          ))}
        </div>
      )}

      {books.length > 0 ? (
        <CategoryResults
          categorySlug={slug}
          sort={sort}
          initialBooks={books}
          total={total}
          initialWishlistIds={books.filter((b) => wishlistIds.has(b.id)).map((b) => b.id)}
        />
      ) : (
        <p className="py-12 text-center text-muted-foreground">No books in this category yet.</p>
      )}
    </div>
  );
}
