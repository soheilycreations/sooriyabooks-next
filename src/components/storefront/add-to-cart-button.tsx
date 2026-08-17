"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/lib/cart/cart-context";

export function AddToCartButton({
  book,
  inStock,
}: {
  book: Omit<CartItem, "quantity">;
  inStock: boolean;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  if (!inStock) {
    return (
      <Button size="lg" disabled className="w-full">
        Out of Stock
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      variant="accent"
      className="w-full"
      onClick={() => {
        addItem(book);
        setAdded(true);
        router.refresh();
        setTimeout(() => setAdded(false), 1500);
      }}
    >
      {added ? "Added to Cart" : "Add to Cart"}
    </Button>
  );
}
