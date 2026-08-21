"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart-context";
import { formatCurrency, cn } from "@/lib/utils";

/**
 * Reads/mutates the same CartProvider state the full /cart page uses
 * (useCart()) — quantity/remove here call the identical
 * updateQuantity/removeItem functions, so there is exactly one cart
 * implementation, just two views onto it.
 */
export function MiniCart({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { items, subtotal, itemCount, updateQuantity, removeItem } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  // Portals to document.body — see the identical note in search-overlay.tsx.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={cn(
          "fixed inset-0 z-[100] bg-black/40 transition-opacity duration-300 ease-premium",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-[101] flex h-full w-full max-w-[420px] flex-col border-l bg-background shadow-2xl transition-transform duration-300 ease-premium",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div>
            <h2 className="font-heading text-xl">Your Cart</h2>
            {itemCount > 0 && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {itemCount} {itemCount === 1 ? "Book" : "Books"} &middot;{" "}
                <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close cart"
            tabIndex={open ? 0 : -1}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {itemCount === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/70">
              <ShoppingBag className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="font-heading text-xl">Your cart is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">Discover something worth reading.</p>
            </div>
            <Button variant="accent" tabIndex={open ? 0 : -1} onClick={() => go("/search")}>
              Browse Books
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ul className="space-y-5">
                {items.map((item) => (
                  <li key={item.bookId} className="flex gap-3">
                    <Link
                      href={`/book/${item.slug}`}
                      tabIndex={open ? 0 : -1}
                      onClick={() => onOpenChange(false)}
                      className="relative aspect-[3/4] h-24 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/60"
                    >
                      {item.coverUrl && (
                        <Image src={item.coverUrl} alt={item.title} fill sizes="72px" className="object-cover" />
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <Link
                          href={`/book/${item.slug}`}
                          tabIndex={open ? 0 : -1}
                          onClick={() => onOpenChange(false)}
                          className="line-clamp-2 font-heading text-sm leading-snug hover:text-accent"
                        >
                          {item.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(item.unitPrice)} each</p>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex h-8 items-center rounded-full border border-input">
                          <button
                            type="button"
                            tabIndex={open ? 0 : -1}
                            aria-label="Decrease quantity"
                            onClick={() => updateQuantity(item.bookId, item.quantity - 1)}
                            className="flex h-full w-7 items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-medium tabular-nums" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            tabIndex={open ? 0 : -1}
                            aria-label="Increase quantity"
                            onClick={() => updateQuantity(item.bookId, item.quantity + 1)}
                            className="flex h-full w-7 items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{formatCurrency(item.unitPrice * item.quantity)}</span>
                          <button
                            type="button"
                            tabIndex={open ? 0 : -1}
                            aria-label={`Remove ${item.title} from cart`}
                            onClick={() => removeItem(item.bookId)}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t px-6 py-5">
              <div className="flex items-baseline justify-between">
                <span className="font-heading text-base">Subtotal</span>
                <span className="font-heading text-xl text-accent">{formatCurrency(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Shipping calculated at checkout.</p>
              <div className="mt-4 flex flex-col gap-2">
                <Button variant="accent" size="lg" tabIndex={open ? 0 : -1} onClick={() => go("/checkout")}>
                  Checkout
                </Button>
                <Button variant="outline" size="lg" tabIndex={open ? 0 : -1} onClick={() => go("/cart")}>
                  View Cart
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}
