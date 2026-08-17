"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleWishlist } from "@/lib/customers/wishlist-actions";
import { cn } from "@/lib/utils";

export function WishlistButton({ bookId, initialInWishlist = false }: { bookId: string; initialInWishlist?: boolean }) {
  const router = useRouter();
  const [inWishlist, setInWishlist] = useState(initialInWishlist);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="icon"
      disabled={isPending}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleWishlist(bookId);
          if (!result.ok) {
            router.push("/login");
            return;
          }
          setInWishlist(result.data.inWishlist);
        })
      }
    >
      <Heart className={cn("h-4 w-4", inWishlist && "fill-destructive text-destructive")} />
    </Button>
  );
}
