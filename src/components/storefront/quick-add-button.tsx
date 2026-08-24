"use client";

import { useState } from "react";
import { ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/lib/cart/cart-context";
import { flyToCart } from "@/lib/cart/fly-to-cart";
import { cn } from "@/lib/utils";
import type { BookCardData } from "@/lib/catalog/queries";

/**
 * Slide-up "Add to Cart" bar under a grid card's cover — lets a shopper add
 * the book without leaving the listing. Reads the card's own cover <img>
 * from the DOM at click time (via closest("a")) rather than needing a ref
 * threaded down from ProductCard, so ProductCard itself can stay a plain
 * server-renderable component instead of becoming a client component just
 * to host this one button.
 */
export function QuickAddButton({ book, outOfStock }: { book: BookCardData; outOfStock: boolean }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      disabled={outOfStock}
      aria-label={outOfStock ? "Out of stock" : "Add to cart"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (outOfStock) return;

        const cardImg = e.currentTarget.closest("a")?.querySelector("img");
        if (cardImg) flyToCart(cardImg, book.coverUrl);

        addItem({
          bookId: book.id,
          slug: book.slug,
          title: book.title,
          unitPrice: book.discountPrice ?? book.sellingPrice,
          weightGrams: book.weightGrams,
          coverUrl: book.coverUrl,
        });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1500);
      }}
      className={cn(
        // Always visible below md — touch devices have no persistent hover
        // state, so a hover-only reveal would never appear at all on phones.
        // From md up (real pointer devices) it tucks away until hovered.
        "absolute inset-x-0 bottom-0 z-10 flex translate-y-0 items-center justify-center gap-1.5 bg-foreground py-2.5 text-xs font-medium uppercase tracking-wide text-background",
        "transition-all duration-300 ease-premium md:translate-y-full md:group-hover:translate-y-0",
        "disabled:cursor-not-allowed disabled:opacity-60",
        added && "md:translate-y-0 bg-accent text-accent-foreground",
      )}
    >
      {added ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Added
        </>
      ) : (
        <>
          <ShoppingBag className="h-3.5 w-3.5" />
          {outOfStock ? "Out of Stock" : "Add to Cart"}
        </>
      )}
    </button>
  );
}
