"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Heart, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWishlistBooks, toggleWishlist } from "@/lib/customers/wishlist-actions";
import { formatCurrency, cn } from "@/lib/utils";
import type { BookCardData } from "@/lib/catalog/queries";

/**
 * Reads/mutates the real wishlist_items table via the same server actions
 * the /account/wishlist page and every ProductCard's wishlist heart already
 * use (getWishlistBooks, toggleWishlist) — not a second wishlist
 * implementation, just another view onto it. Portaled to document.body for
 * the same stacking-context reason as MiniCart/SearchOverlay.
 */
export function WishlistDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(true);
  const [books, setBooks] = useState<BookCardData[]>([]);

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

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getWishlistBooks().then((result) => {
      setAuthenticated(result.authenticated);
      setBooks(result.books);
      setLoading(false);
    });
  }, [open]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  function handleRemove(bookId: string) {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    toggleWishlist(bookId);
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
        aria-label="Your wishlist"
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-[101] flex h-full w-full max-w-[420px] flex-col border-l bg-background shadow-2xl transition-transform duration-300 ease-premium",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b px-6 py-5">
          <h2 className="font-heading text-xl">Your Wishlist</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close wishlist"
            tabIndex={open ? 0 : -1}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !authenticated ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/70">
              <Heart className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="font-heading text-xl">Sign in to see your wishlist</p>
              <p className="mt-1 text-sm text-muted-foreground">Save books you love and find them here.</p>
            </div>
            <Button variant="accent" tabIndex={open ? 0 : -1} onClick={() => go("/login")}>
              Sign In
            </Button>
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/70">
              <Heart className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="font-heading text-xl">Your wishlist is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">Save books you love and find them here.</p>
            </div>
            <Button variant="accent" tabIndex={open ? 0 : -1} onClick={() => go("/search")}>
              Browse Books
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ul className="space-y-5">
                {books.map((book) => {
                  const isOnSale = book.discountPrice != null && book.discountPrice < book.sellingPrice;
                  return (
                    <li key={book.id} className="flex gap-3">
                      <Link
                        href={`/book/${book.slug}`}
                        tabIndex={open ? 0 : -1}
                        onClick={() => onOpenChange(false)}
                        className="relative aspect-[3/4] h-24 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/60"
                      >
                        {book.coverUrl && (
                          <Image src={book.coverUrl} alt={book.title} fill sizes="72px" className="object-cover" />
                        )}
                      </Link>
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <Link
                            href={`/book/${book.slug}`}
                            tabIndex={open ? 0 : -1}
                            onClick={() => onOpenChange(false)}
                            className="line-clamp-2 font-heading text-sm leading-snug hover:text-accent"
                          >
                            {book.title}
                          </Link>
                          {book.authorName && <p className="mt-1 text-xs text-muted-foreground">{book.authorName}</p>}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          {isOnSale ? (
                            <span className="flex items-baseline gap-1.5">
                              <span className="text-sm font-medium text-accent">
                                {formatCurrency(book.discountPrice!)}
                              </span>
                              <span className="text-xs text-muted-foreground line-through">
                                {formatCurrency(book.sellingPrice)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-sm font-medium">{formatCurrency(book.sellingPrice)}</span>
                          )}
                          <button
                            type="button"
                            tabIndex={open ? 0 : -1}
                            aria-label={`Remove ${book.title} from wishlist`}
                            onClick={() => handleRemove(book.id)}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="border-t px-6 py-5">
              <Button variant="outline" size="lg" className="w-full" tabIndex={open ? 0 : -1} onClick={() => go("/account/wishlist")}>
                View Wishlist
              </Button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}
