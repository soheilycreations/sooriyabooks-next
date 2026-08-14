import Link from "next/link";
import { Heart, Search, ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/category/fiction", label: "Fiction" },
  { href: "/category/non-fiction", label: "Non-Fiction" },
  { href: "/category/children", label: "Children" },
  { href: "/category/academic", label: "Academic" },
  { href: "/blog", label: "Blog" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-20 items-center justify-between">
        <Link href="/" className="font-heading text-2xl tracking-tight">
          Sooriya <span className="text-accent">Publishers</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Search">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Wishlist" asChild>
            <Link href="/account/wishlist">
              <Heart className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" aria-label="Account" asChild>
            <Link href="/account">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" aria-label="Cart" asChild>
            <Link href="/cart">
              <ShoppingBag className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
