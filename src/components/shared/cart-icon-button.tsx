"use client";

import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart-context";

/** Opens the mini-cart drawer rather than navigating — the badge count still
 *  comes straight from the same cart context the drawer and /cart page use. */
export function CartIconButton({ onClick }: { onClick: () => void }) {
  const { itemCount } = useCart();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Cart"
      data-cart-target
      className="relative"
      onClick={onClick}
    >
      <ShoppingBag className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
          {itemCount}
        </span>
      )}
    </Button>
  );
}
