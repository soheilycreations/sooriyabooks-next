import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/storefront/product-card";
import { getBooksByCategory } from "@/lib/catalog/queries";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 3600;

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

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const books = await getBooksByCategory(slug);

  return (
    <div className="container py-12">
      <h1 className="font-heading text-3xl">{category.name}</h1>
      {category.description && (
        <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
      )}

      {books.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
          {books.map((book) => (
            <ProductCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-muted-foreground">No books in this category yet.</p>
      )}
    </div>
  );
}
