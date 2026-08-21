"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartIconButton } from "@/components/shared/cart-icon-button";
import { MegaMenu } from "@/components/shared/mega-menu";
import { SearchOverlay } from "@/components/shared/search-overlay";
import { MiniCart } from "@/components/shared/mini-cart";
import { MobileNav } from "@/components/shared/mobile-nav";
import { Logo } from "@/components/shared/logo";
import type { NavCategory } from "@/lib/catalog/nav-categories";
import { cn, navLinkFocusClass } from "@/lib/utils";

const navLinkClass = cn(
  "relative py-1 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground",
  "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 after:ease-premium hover:after:scale-x-100",
  navLinkFocusClass,
);

/** Only one overlay (mega menu / search / mini-cart) is ever open at once —
 *  a single piece of state, rather than three independent booleans, makes
 *  that mutual exclusion automatic instead of something each overlay has
 *  to remember to enforce. */
type Overlay = "menu" | "search" | "cart" | null;

export function HeaderClient({ categories }: { categories: NavCategory[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-background/95 backdrop-blur transition-shadow duration-300 ease-premium supports-[backdrop-filter]:bg-background/80",
        scrolled && "shadow-sm",
      )}
    >
      {/* The shrink is done with padding + a logo transform (compositor-only), never
          `height`, on purpose: transitioning `height` directly on a `position: sticky`
          element is a known source of flaky/stuck repaints in Chromium. Padding and
          transform both animate reliably here regardless of sticky state. */}
      <div
        className={cn(
          "container flex items-center transition-[padding] duration-300 ease-premium",
          scrolled ? "py-3" : "py-5",
        )}
      >
        <div className="flex shrink-0 items-center gap-2">
          <MobileNav categories={categories} />
          <div
            className={cn(
              "origin-left transition-transform duration-300 ease-premium",
              scrolled && "scale-[0.85]",
            )}
          >
            <Logo variant="full" height={38} priority className="hidden sm:block" />
            <Logo variant="mark" height={34} className="sm:hidden" />
          </div>
        </div>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:ml-8 lg:flex">
          <MegaMenu
            categories={categories}
            open={overlay === "menu"}
            onOpenChange={(open) => setOverlay(open ? "menu" : null)}
          />
          <Link href="/search" className={cn(navLinkClass, "px-3 py-2")}>
            Books
          </Link>
          <Link href="/about" className={cn(navLinkClass, "px-3 py-2")}>
            About
          </Link>
          <Link href="/blog" className={cn(navLinkClass, "px-3 py-2")}>
            Blog
          </Link>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            aria-expanded={overlay === "search"}
            onClick={() => setOverlay(overlay === "search" ? null : "search")}
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Wishlist" asChild className="hidden sm:inline-flex">
            <Link href="/account/wishlist">
              <Heart className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" aria-label="Account" asChild className="hidden sm:inline-flex">
            <Link href="/account">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <CartIconButton onClick={() => setOverlay(overlay === "cart" ? null : "cart")} />
        </div>
      </div>

      <SearchOverlay open={overlay === "search"} onOpenChange={(open) => setOverlay(open ? "search" : null)} />
      <MiniCart open={overlay === "cart"} onOpenChange={(open) => setOverlay(open ? "cart" : null)} />
    </header>
  );
}
