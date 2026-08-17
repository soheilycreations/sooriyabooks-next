import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/storefront/product-card";
import type { BookCardData } from "@/lib/catalog/queries";

export const revalidate = 3600;

async function getAuthor(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("authors").select("*").eq("slug", slug).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) return {};
  return { title: author.seo_title || author.name, description: author.seo_description || author.bio || undefined };
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select(
      `id, title, slug, selling_price, discount_price,
       book_images ( is_primary, sort_order, media_assets ( storage_path ) )`,
    )
    .eq("author_id", author.id)
    .eq("is_active", true)
    .limit(48);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const books: BookCardData[] = (data ?? []).map((row: any) => {
    const primary = [...(row.book_images ?? [])].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
    )[0];
    const coverUrl = primary?.media_assets?.storage_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${primary.media_assets.storage_path}`
      : null;
    return { id: row.id, title: row.title, slug: row.slug, sellingPrice: Number(row.selling_price), discountPrice: row.discount_price ? Number(row.discount_price) : null, authorName: author.name, coverUrl };
  });

  const photoUrl = author.photo_url;

  return (
    <div className="container py-12">
      <div className="mb-10 flex items-center gap-6">
        {photoUrl && (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-muted">
            <Image src={photoUrl} alt={author.name} fill className="object-cover" />
          </div>
        )}
        <div>
          <h1 className="font-heading text-3xl">{author.name}</h1>
          {author.bio && <p className="mt-2 max-w-2xl text-muted-foreground">{author.bio}</p>}
        </div>
      </div>

      {books.length > 0 ? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {books.map((book) => (
            <ProductCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No books by this author yet.</p>
      )}
    </div>
  );
}
