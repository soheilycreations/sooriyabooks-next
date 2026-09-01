"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartIconButton } from "@/components/shared/cart-icon-button";
import { MegaMenu } from "@/components/shared/mega-menu";
import { SearchOverlay } from "@/components/shared/search-overlay";
import { MiniCart } from "@/components/shared/mini-cart";
import { WishlistDrawer } from "@/components/shared/wishlist-drawer";
import { AccountDrawer } from "@/components/shared/account-drawer";
import { MobileNav } from "@/components/shared/mobile-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";
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
type Overlay = "menu" | "search" | "cart" | "wishlist" | "account" | null;

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
            <Logo variant="full" height={28} priority className="sm:hidden" />
          </div>
        </div>

        {/* Large flexible gap — grows/shrinks with viewport width, pushing the nav
            and action icons together toward the right rather than centering or
            spacing them across the whole header. */}
        <div className="flex-1" aria-hidden />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          <Link href="/" className={cn(navLinkClass, "px-3 py-2")}>
            Home
          </Link>
          <MegaMenu
            categories={categories}
            open={overlay === "menu"}
            onOpenChange={(open) => setOverlay(open ? "menu" : null)}
          />
          <Link href="/awards" className={cn(navLinkClass, "px-3 py-2")}>
            Award
          </Link>
          <Link href="/about" className={cn(navLinkClass, "px-3 py-2")}>
            About
          </Link>
          <Link href="/blog" className={cn(navLinkClass, "px-3 py-2")}>
            Blog
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1 lg:ml-6">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            aria-expanded={overlay === "search"}
            onClick={() => setOverlay(overlay === "search" ? null : "search")}
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Wishlist"
            aria-expanded={overlay === "wishlist"}
            className="hidden sm:inline-flex"
            onClick={() => setOverlay(overlay === "wishlist" ? null : "wishlist")}
          >
            <Heart className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Account"
            aria-expanded={overlay === "account"}
            className="hidden sm:inline-flex"
            onClick={() => setOverlay(overlay === "account" ? null : "account")}
          >
            <User className="h-5 w-5" />
          </Button>
          <CartIconButton onClick={() => setOverlay(overlay === "cart" ? null : "cart")} />
        </div>
      </div>

      <SearchOverlay open={overlay === "search"} onOpenChange={(open) => setOverlay(open ? "search" : null)} />
      <MiniCart open={overlay === "cart"} onOpenChange={(open) => setOverlay(open ? "cart" : null)} />
      <WishlistDrawer open={overlay === "wishlist"} onOpenChange={(open) => setOverlay(open ? "wishlist" : null)} />
      <AccountDrawer open={overlay === "account"} onOpenChange={(open) => setOverlay(open ? "account" : null)} />
    </header>
  );
}
