"use client";

import { useEffect, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { isInWishlist, toggleWishlist } from "@/lib/customers/wishlist-actions";
import { cn } from "@/lib/utils";

/**
 * The cart is entirely client-rendered from localStorage (see cart-context),
 * so unlike ProductCard elsewhere there's no server-computed initial state to
 * pass in — this looks its own status up once on mount.
 */
export function CartWishlistToggle({ bookId }: { bookId: string }) {
  const [inWishlist, setInWishlist] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    isInWishlist(bookId).then((result) => {
      if (!cancelled) setInWishlist(result);
    });
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  if (inWishlist === null) return <span className="inline-block h-4 w-4" aria-hidden />;

  return (
    <button
      type="button"
      disabled={isPending}
      aria-label={inWishlist ? "Remove from wishlist" : "Save for later"}
      aria-pressed={inWishlist}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleWishlist(bookId);
          if (result.ok) setInWishlist(result.data.inWishlist);
        })
      }
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
    >
      <Heart className={cn("h-3.5 w-3.5", inWishlist && "fill-destructive text-destructive")} />
      {inWishlist ? "Saved" : "Save for later"}
    </button>
  );
}
