import Link from "next/link";
import { Heart, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartIconButton } from "@/components/shared/cart-icon-button";
import { createClient } from "@/lib/supabase/server";

async function getTopNavCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("name, slug")
    .is("parent_id", null)
    .order("sort_order")
    .limit(6);
  return data ?? [];
}

export async function Header() {
  const categories = await getTopNavCategories();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-20 items-center justify-between">
        <Link href="/" className="font-heading text-2xl tracking-tight">
          Sooriya <span className="text-accent">Publishers</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {cat.name}
            </Link>
          ))}
          <Link href="/blog" className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground">
            Blog
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Search" asChild>
            <Link href="/search">
              <Search className="h-5 w-5" />
            </Link>
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
          <CartIconButton />
        </div>
      </div>
    </header>
  );
}
