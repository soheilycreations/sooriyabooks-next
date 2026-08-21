import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, Truck } from "lucide-react";
import { getBookBySlug, getRelatedBooks } from "@/lib/catalog/queries";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { ReviewsSection } from "@/components/storefront/reviews-section";
import { ProductCard } from "@/components/storefront/product-card";
import { SectionHeading } from "@/components/storefront/section-heading";
import { Reveal } from "@/components/storefront/reveal";
import { isInWishlist, getWishlistBookIds } from "@/lib/customers/wishlist-actions";
import { getBookReviews } from "@/lib/customers/review-queries";
import { formatCurrency, decodeHtmlEntities, cn } from "@/lib/utils";
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
  // Legacy WordPress/WooCommerce import left some text fields with
  // un-decoded HTML entities (e.g. "&amp;") — decode at render time.
  b.title = decodeHtmlEntities(b.title);
  if (b.subtitle) b.subtitle = decodeHtmlEntities(b.subtitle);
  if (b.short_description) b.short_description = decodeHtmlEntities(b.short_description);
  if (b.description) b.description = decodeHtmlEntities(b.description);
  if (b.authors?.name) b.authors.name = decodeHtmlEntities(b.authors.name);
  if (b.publishers?.name) b.publishers.name = decodeHtmlEntities(b.publishers.name);
  const images = (b.book_images ?? []) as Array<{
    is_primary: boolean;
    sort_order: number;
    media_assets: { storage_path: string; alt_text: string | null } | null;
  }>;
  const sorted = [...images].sort(
    (a, c) => Number(c.is_primary) - Number(a.is_primary) || a.sort_order - c.sort_order,
  );
  // Previously only sorted[0] (the cover) was ever used, silently
  // discarding every other uploaded image — this is the fix: pass the
  // full set through to a real gallery instead.
  const galleryImages = sorted
    .filter((img) => img.media_assets?.storage_path)
    .map((img) => ({
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${img.media_assets!.storage_path}`,
      alt: img.media_assets?.alt_text || b.title,
    }));

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
  // Only meaningful (and only passed to the stepper) when stock is actually
  // tracked — untracked products keep the original 99 ceiling, unchanged.
  const availableQuantity = stockTrackingEnabled ? Math.max(1, trackedAvailable) : undefined;
  const [inWishlist, reviews, relatedBooks, relatedWishlistIds] = await Promise.all([
    isInWishlist(b.id),
    getBookReviews(b.id),
    getRelatedBooks(b.id, 4),
    getWishlistBookIds(),
  ]);
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

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

  // Non-empty metadata rows only — an editorial divided list rather than a
  // fixed-shape grid, so a book missing e.g. edition/page count doesn't
  // leave a visible gap.
  const metaRows: Array<{ label: string; value: React.ReactNode }> = [];
  if (b.isbn) metaRows.push({ label: "ISBN", value: b.isbn });
  if (b.publishers) {
    metaRows.push({
      label: "Publisher",
      value: (
        <Link href={`/publisher/${b.publishers.slug}`} className="hover:text-accent">
          {b.publishers.name}
        </Link>
      ),
    });
  }
  metaRows.push({ label: "Language", value: b.language });
  if (b.edition) metaRows.push({ label: "Edition", value: b.edition });
  if (b.page_count) metaRows.push({ label: "Pages", value: b.page_count });
  metaRows.push({ label: "Weight", value: `${b.weight_grams}g` });
  metaRows.push({ label: "SKU", value: b.sku });

  return (
    <div className="container py-12 md:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="grid min-w-0 gap-12 md:grid-cols-2 md:gap-20">
        <div className="min-w-0 md:sticky md:top-24 md:self-start">
          <ProductGallery images={galleryImages} title={b.title} />
        </div>

        <div className="min-w-0 motion-safe:animate-fade-up [animation-delay:80ms] motion-safe:[animation-fill-mode:backwards]">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-accent">
            <span className="h-px w-6 bg-accent" aria-hidden />
            Book Details
          </p>

          {b.authors && (
            <Link
              href={`/author/${b.authors.slug}`}
              className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
            >
              {b.authors.name}
            </Link>
          )}
          <h1 className="mt-2 text-balance font-heading text-3xl leading-tight tracking-tight md:text-[2.75rem] md:leading-[1.1]">
            {b.title}
          </h1>
          {b.subtitle && <p className="mt-2 text-lg text-muted-foreground">{b.subtitle}</p>}

          {reviews.length > 0 && (
            <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      "h-3.5 w-3.5",
                      n <= Math.round(avgRating) ? "fill-accent text-accent" : "text-muted-foreground/40",
                    )}
                  />
                ))}
              </span>
              <span>
                {avgRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
              </span>
            </a>
          )}

          <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1.5 border-t pt-6">
            {isOnSale ? (
              <>
                <span className="font-heading text-3xl text-accent">
                  {formatCurrency(Number(b.discount_price))}
                </span>
                <span className="text-lg text-muted-foreground line-through">
                  {formatCurrency(Number(b.selling_price))}
                </span>
                <Badge variant="accent">
                  -{Math.round(((Number(b.selling_price) - Number(b.discount_price)) / Number(b.selling_price)) * 100)}%
                </Badge>
              </>
            ) : (
              <span className="font-heading text-3xl">{formatCurrency(Number(b.selling_price))}</span>
            )}
          </div>

          <div className="mt-3">
            {!isAvailable ? (
              <Badge variant="destructive">Out of Stock</Badge>
            ) : isLowStock ? (
              <Badge variant="secondary">Low Stock</Badge>
            ) : (
              <Badge variant="success">In Stock</Badge>
            )}
          </div>

          {b.short_description && (
            <p className="mt-5 leading-relaxed text-muted-foreground">{b.short_description}</p>
          )}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <AddToCartButton
                book={{
                  bookId: b.id,
                  slug: b.slug,
                  title: b.title,
                  unitPrice: isOnSale ? Number(b.discount_price) : Number(b.selling_price),
                  weightGrams: b.weight_grams,
                  coverUrl: galleryImages[0]?.url ?? null,
                }}
                inStock={isAvailable}
                {...(availableQuantity !== undefined ? { maxQuantity: availableQuantity } : {})}
              />
            </div>
            <WishlistButton bookId={b.id} initialInWishlist={inWishlist} className="h-12 w-12" />
          </div>

          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="h-4 w-4 text-accent" aria-hidden />
            Island-wide delivery available.
          </p>

          {metaRows.length > 0 && (
            <dl className="mt-8 divide-y border-t text-sm">
              {metaRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {b.description && (
        <div className="mt-20 max-w-3xl border-t pt-10">
          <h2 className="font-heading text-2xl">Description</h2>
          <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">{b.description}</p>
        </div>
      )}

      <div id="reviews" className="mt-20 max-w-3xl scroll-mt-24 border-t pt-10">
        <ReviewsSection bookId={b.id} reviews={reviews} />
      </div>

      {relatedBooks.length > 0 && (
        <div className="mt-20 border-t pt-12">
          <SectionHeading eyebrow="You might also like" title="Related Books" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
            {relatedBooks.map((related, i) => (
              <Reveal key={related.id} index={i}>
                <ProductCard
                  book={related}
                  showWishlist
                  inWishlist={relatedWishlistIds.has(related.id)}
                />
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
