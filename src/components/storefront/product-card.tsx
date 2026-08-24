import Image from "next/image";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";
import type { BookCardData } from "@/lib/catalog/queries";
import { Badge } from "@/components/ui/badge";
import { CardWishlistButton } from "@/components/storefront/card-wishlist-button";

export function ProductCard({
  book,
  className,
  showWishlist = false,
  inWishlist = false,
}: {
  book: BookCardData;
  className?: string;
  /** Off by default — pages that render cards without wishlist context (e.g.
   *  search) can skip the extra button; homepage passes true. */
  showWishlist?: boolean;
  inWishlist?: boolean;
}) {
  const isOnSale = book.discountPrice != null && book.discountPrice < book.sellingPrice;
  const percentOff = isOnSale
    ? Math.round(((book.sellingPrice - book.discountPrice!) / book.sellingPrice) * 100)
    : 0;
  const isOutOfStock = book.inStock === false;

  return (
    <Link href={`/book/${book.slug}`} className={cn("group block", className)}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted shadow-sm ring-1 ring-border/60 transition-shadow duration-300 ease-premium group-hover:shadow-lg">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={book.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className={cn(
              "object-cover transition-transform duration-500 ease-premium group-hover:scale-[1.04]",
              isOutOfStock && "opacity-60 grayscale-[0.3]",
            )}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No cover
          </div>
        )}

        {/* Subtle bottom-edge shade on hover — grounds the badges/wishlist button without a full overlay. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/15 to-transparent opacity-0 transition-opacity duration-300 ease-premium group-hover:opacity-100" />

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {isOnSale && <Badge variant="accent">-{percentOff}%</Badge>}
          {isOutOfStock && <Badge variant="secondary">Out of stock</Badge>}
          {!isOutOfStock && book.lowStock && <Badge variant="outline">Low stock</Badge>}
        </div>

        {showWishlist && <CardWishlistButton bookId={book.id} initialInWishlist={inWishlist} />}
      </div>
      <p className="mt-3 line-clamp-2 font-heading text-base leading-snug tracking-tight text-foreground transition-colors duration-200 group-hover:text-accent">
        {book.title}
      </p>
      {book.authorName && <p className="mt-1 text-sm text-muted-foreground">{book.authorName}</p>}
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {isOnSale ? (
          <>
            <span className="font-medium text-accent">{formatCurrency(book.discountPrice!)}</span>
            <span className="text-sm text-muted-foreground line-through">
              {formatCurrency(book.sellingPrice)}
            </span>
          </>
        ) : (
          <span className="font-medium text-foreground">{formatCurrency(book.sellingPrice)}</span>
        )}
      </div>
    </Link>
  );
}
