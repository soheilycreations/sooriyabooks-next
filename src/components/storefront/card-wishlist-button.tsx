"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleWishlist } from "@/lib/customers/wishlist-actions";
import { cn } from "@/lib/utils";

/**
 * Compact floating wishlist toggle for product cards (grids/shelves) — a
 * lighter-weight sibling to WishlistButton (which is styled for the PDP's
 * full-size action row, not a small image-corner overlay).
 */
export function CardWishlistButton({ bookId, initialInWishlist = false }: { bookId: string; initialInWishlist?: boolean }) {
  const router = useRouter();
  const [inWishlist, setInWishlist] = useState(initialInWishlist);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={inWishlist}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
          const result = await toggleWishlist(bookId);
          if (!result.ok) {
            router.push("/login");
            return;
          }
          setInWishlist(result.data.inWishlist);
        });
      }}
      className={cn(
        "absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-transform duration-200 ease-premium hover:scale-105 disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <Heart className={cn("h-4 w-4", inWishlist ? "fill-destructive text-destructive" : "text-foreground/70")} />
    </button>
  );
}
