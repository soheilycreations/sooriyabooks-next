import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/storefront/product-card";
import { Reveal } from "@/components/storefront/reveal";
import { BOOK_CARD_SELECT_WITH_STOCK, mapBookRowToCard } from "@/lib/catalog/queries";
import { getWishlistBookIds } from "@/lib/customers/wishlist-actions";
import { createClient } from "@/lib/supabase/server";

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
  const [{ data }, wishlistIds] = await Promise.all([
    supabase
      .from("books")
      .select(BOOK_CARD_SELECT_WITH_STOCK)
      .eq("author_id", author.id)
      .eq("is_active", true)
      .limit(48),
    getWishlistBookIds(),
  ]);

  const books = (data ?? []).map(mapBookRowToCard);
  const photoUrl = author.photo_url;

  return (
    <div className="container py-12 md:py-16">
      <div className="mb-10 flex items-center gap-6">
        {photoUrl && (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-muted">
            <Image src={photoUrl} alt={author.name} fill className="object-cover" />
          </div>
        )}
        <div>
          <h1 className="font-heading text-3xl leading-tight md:text-4xl md:leading-tight">{author.name}</h1>
          {author.bio && <p className="mt-2 max-w-2xl text-muted-foreground">{author.bio}</p>}
          <p className="mt-2 text-sm text-muted-foreground">
            {books.length} {books.length === 1 ? "book" : "books"}
          </p>
        </div>
      </div>

      {books.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {books.map((book, i) => (
            <Reveal key={book.id} index={i % 8}>
              <ProductCard book={book} showWishlist inWishlist={wishlistIds.has(book.id)} />
            </Reveal>
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-muted-foreground">No books by this author yet.</p>
      )}
    </div>
  );
}
