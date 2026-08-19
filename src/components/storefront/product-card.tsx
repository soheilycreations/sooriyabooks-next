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
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={book.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className={cn(
              "object-cover transition-transform duration-300 ease-premium group-hover:scale-[1.03]",
              isOutOfStock && "opacity-60 grayscale-[0.3]",
            )}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No cover
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {isOnSale && <Badge variant="accent">-{percentOff}%</Badge>}
          {isOutOfStock && <Badge variant="secondary">Out of stock</Badge>}
          {!isOutOfStock && book.lowStock && <Badge variant="outline">Low stock</Badge>}
        </div>

        {showWishlist && <CardWishlistButton bookId={book.id} initialInWishlist={inWishlist} />}
      </div>
      <p className="mt-3 line-clamp-2 font-heading text-base leading-snug">{book.title}</p>
      {book.authorName && <p className="mt-1 text-sm text-muted-foreground">{book.authorName}</p>}
      <div className="mt-2 flex items-center gap-2">
        {isOnSale ? (
          <>
            <span className="font-medium text-accent">{formatCurrency(book.discountPrice!)}</span>
            <span className="text-sm text-muted-foreground line-through">
              {formatCurrency(book.sellingPrice)}
            </span>
          </>
        ) : (
          <span className="font-medium">{formatCurrency(book.sellingPrice)}</span>
        )}
      </div>
    </Link>
  );
}
