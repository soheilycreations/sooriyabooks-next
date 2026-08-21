"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/lib/cart/cart-context";

export function AddToCartButton({
  book,
  inStock,
  maxQuantity = 99,
}: {
  book: Omit<CartItem, "quantity">;
  inStock: boolean;
  /** Caps the stepper at real available stock when it's known; falls back to
   *  the original hardcoded 99 ceiling when not passed — server-side stock
   *  validation is unchanged either way, this only tightens the UI hint. */
  maxQuantity?: number;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!inStock) {
    return (
      <Button size="lg" disabled className="w-full">
        Out of Stock
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 shrink-0 items-center rounded-full border border-input">
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="flex h-full w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          disabled={quantity <= 1}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-sm font-medium tabular-nums" aria-live="polite">
          {quantity}
        </span>
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
          className="flex h-full w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          disabled={quantity >= maxQuantity}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <Button
        size="lg"
        variant="accent"
        className="flex-1 shadow-md shadow-accent/15 transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:translate-y-0 active:scale-[0.98]"
        onClick={() => {
          addItem(book, quantity);
          setAdded(true);
          setQuantity(1);
          router.refresh();
          setTimeout(() => setAdded(false), 1500);
        }}
      >
        {added ? (
          <>
            <Check className="h-4 w-4" />
            Added to Cart
          </>
        ) : (
          "Add to Cart"
        )}
      </Button>
    </div>
  );
}
