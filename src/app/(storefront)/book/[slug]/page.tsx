import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookBySlug } from "@/lib/catalog/queries";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { ReviewsSection } from "@/components/storefront/reviews-section";
import { isInWishlist } from "@/lib/customers/wishlist-actions";
import { getBookReviews } from "@/lib/customers/review-queries";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return {};
  return {
    title: book.seo_title || book.title,
    description: book.seo_description || book.short_description || undefined,
  };
}

export default async function BookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = book as any;
  const images = (b.book_images ?? []) as Array<{
    is_primary: boolean;
    sort_order: number;
    media_assets: { storage_path: string; alt_text: string | null } | null;
  }>;
  const sorted = [...images].sort(
    (a, c) => Number(c.is_primary) - Number(a.is_primary) || a.sort_order - c.sort_order,
  );
  const primaryPath = sorted[0]?.media_assets?.storage_path;
  const coverUrl = primaryPath
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${primaryPath}`
    : null;

  // Stock tracking is per-product (see supabase/migrations/0011-0012):
  // most migrated WordPress products never had a real numeric stock count,
  // only a sellable/unavailable flag — "untracked" mode reflects that
  // honestly instead of showing a fabricated quantity or a false
  // "Out of Stock" for products that are actually sellable.
  const stockTrackingEnabled = b.inventory?.stock_tracking_enabled ?? true;
  const onHand = b.inventory?.quantity_on_hand ?? 0;
  const reserved = b.inventory?.quantity_reserved ?? 0;
  const trackedAvailable = onHand - reserved;
  const isAvailable = stockTrackingEnabled ? trackedAvailable > 0 : (b.inventory?.untracked_available ?? true);
  const isLowStock = stockTrackingEnabled && trackedAvailable > 0 && trackedAvailable <= 5;
  const isOnSale = b.discount_price != null && Number(b.discount_price) < Number(b.selling_price);
  const [inWishlist, reviews] = await Promise.all([isInWishlist(b.id), getBookReviews(b.id)]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: b.title,
    isbn: b.isbn ?? undefined,
    author: b.authors ? { "@type": "Person", name: b.authors.name } : undefined,
    publisher: b.publishers ? { "@type": "Organization", name: b.publishers.name } : undefined,
    offers: {
      "@type": "Offer",
      price: isOnSale ? b.discount_price : b.selling_price,
      priceCurrency: "LKR",
      availability: isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="grid gap-10 md:grid-cols-2">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
          {coverUrl ? (
            <Image src={coverUrl} alt={b.title} fill sizes="50vw" className="object-cover" priority />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No cover available
            </div>
          )}
        </div>

        <div>
          {b.authors && (
            <Link href={`/author/${b.authors.slug}`} className="text-sm text-accent hover:underline">
              {b.authors.name}
            </Link>
          )}
          <h1 className="mt-2 font-heading text-3xl">{b.title}</h1>
          {b.subtitle && <p className="mt-1 text-lg text-muted-foreground">{b.subtitle}</p>}

          <div className="mt-4 flex items-center gap-3">
            {isOnSale ? (
              <>
                <span className="font-heading text-2xl text-accent">
                  {formatCurrency(Number(b.discount_price))}
                </span>
                <span className="text-lg text-muted-foreground line-through">
                  {formatCurrency(Number(b.selling_price))}
                </span>
              </>
            ) : (
              <span className="font-heading text-2xl">{formatCurrency(Number(b.selling_price))}</span>
            )}
            {!isAvailable ? (
              <Badge variant="destructive">Out of Stock</Badge>
            ) : isLowStock ? (
              <Badge variant="secondary">Low Stock</Badge>
            ) : (
              <Badge variant="success">In Stock</Badge>
            )}
          </div>

          {b.short_description && (
            <p className="mt-4 text-muted-foreground">{b.short_description}</p>
          )}

          <div className="mt-6 flex gap-2">
            <div className="flex-1">
              <AddToCartButton
                book={{
                  bookId: b.id,
                  slug: b.slug,
                  title: b.title,
                  unitPrice: isOnSale ? Number(b.discount_price) : Number(b.selling_price),
                  weightGrams: b.weight_grams,
                  coverUrl,
                }}
                inStock={isAvailable}
              />
            </div>
            <WishlistButton bookId={b.id} initialInWishlist={inWishlist} />
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-y-2 border-t pt-6 text-sm">
            {b.isbn && (
              <>
                <dt className="text-muted-foreground">ISBN</dt>
                <dd>{b.isbn}</dd>
              </>
            )}
            {b.publishers && (
              <>
                <dt className="text-muted-foreground">Publisher</dt>
                <dd>
                  <Link href={`/publisher/${b.publishers.slug}`} className="hover:underline">
                    {b.publishers.name}
                  </Link>
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Language</dt>
            <dd>{b.language}</dd>
            {b.edition && (
              <>
                <dt className="text-muted-foreground">Edition</dt>
                <dd>{b.edition}</dd>
              </>
            )}
            {b.page_count && (
              <>
                <dt className="text-muted-foreground">Pages</dt>
                <dd>{b.page_count}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Weight</dt>
            <dd>{b.weight_grams}g</dd>
            <dt className="text-muted-foreground">SKU</dt>
            <dd>{b.sku}</dd>
          </dl>
        </div>
      </div>

      {b.description && (
        <div className="mt-16 max-w-3xl border-t pt-10">
          <h2 className="font-heading text-2xl">Description</h2>
          <p className="mt-4 whitespace-pre-line text-muted-foreground">{b.description}</p>
        </div>
      )}

      <div className="mt-16 max-w-3xl border-t pt-10">
        <ReviewsSection bookId={b.id} reviews={reviews} />
      </div>
    </div>
  );
}
