import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/storefront/product-card";
import { Reveal } from "@/components/storefront/reveal";
import { BOOK_CARD_SELECT_WITH_STOCK, mapBookRowToCard } from "@/lib/catalog/queries";
import { getWishlistBookIds } from "@/lib/customers/wishlist-actions";
import { createClient } from "@/lib/supabase/server";
import { decodeHtmlEntities } from "@/lib/utils";

export const revalidate = 3600;

async function getPublisher(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("publishers").select("*").eq("slug", slug).maybeSingle();
  if (!data) return data;
  return {
    ...data,
    name: decodeHtmlEntities(data.name),
    description: data.description ? decodeHtmlEntities(data.description) : data.description,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const publisher = await getPublisher(slug);
  if (!publisher) return {};
  return { title: publisher.seo_title || publisher.name, description: publisher.seo_description || publisher.description || undefined };
}

export default async function PublisherPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const publisher = await getPublisher(slug);
  if (!publisher) notFound();

  const supabase = await createClient();
  const [{ data }, wishlistIds] = await Promise.all([
    supabase
      .from("books")
      .select(BOOK_CARD_SELECT_WITH_STOCK)
      .eq("publisher_id", publisher.id)
      .eq("is_active", true)
      .limit(48),
    getWishlistBookIds(),
  ]);

  const books = (data ?? []).map(mapBookRowToCard);

  return (
    <div className="container py-12 md:py-16">
      <div className="mb-10 flex items-center gap-6">
        {publisher.logo_url && (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
            <Image src={publisher.logo_url} alt={publisher.name} fill className="object-contain" />
          </div>
        )}
        <div>
          <h1 className="font-heading text-3xl leading-tight md:text-4xl md:leading-tight">{publisher.name}</h1>
          {publisher.description && <p className="mt-2 max-w-2xl text-muted-foreground">{publisher.description}</p>}
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
        <p className="py-12 text-center text-muted-foreground">No books from this publisher yet.</p>
      )}
    </div>
  );
}
