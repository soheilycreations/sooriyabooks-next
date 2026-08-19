"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartIconButton } from "@/components/shared/cart-icon-button";
import { HeaderSearch } from "@/components/shared/header-search";
import { MobileNav } from "@/components/shared/mobile-nav";
import { Logo } from "@/components/shared/logo";
import type { NavCategory } from "@/lib/catalog/nav-categories";
import { cn, navLinkFocusClass } from "@/lib/utils";

const navLinkClass = cn("text-sm font-medium text-foreground/80 hover:text-foreground", navLinkFocusClass);

export function HeaderClient({ categories }: { categories: NavCategory[] }) {
  const [scrolled, setScrolled] = useState(false);

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
          "container flex items-center justify-between transition-[padding] duration-300 ease-premium",
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

        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {categories.map((cat) => (
            <Link key={cat.slug} href={`/category/${cat.slug}`} className={navLinkClass}>
              {cat.name}
            </Link>
          ))}
          <Link href="/search" className={navLinkClass}>
            All Books
          </Link>
          <Link href="/blog" className={navLinkClass}>
            Blog
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <div className="hidden sm:block">
            <HeaderSearch />
          </div>
          <Button variant="ghost" size="icon" aria-label="Search" asChild className="sm:hidden">
            <Link href="/search">
              <Search className="h-5 w-5" />
            </Link>
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
          <CartIconButton />
        </div>
      </div>
    </header>
  );
}
