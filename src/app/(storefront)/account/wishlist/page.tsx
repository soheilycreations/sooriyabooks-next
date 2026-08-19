import Link from "next/link";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/storefront/reveal";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { BOOK_CARD_SELECT_WITH_STOCK, mapBookRowToCard } from "@/lib/catalog/queries";

export default async function WishlistPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("wishlist_items")
    .select(`book_id, books ( ${BOOK_CARD_SELECT_WITH_STOCK} )`)
    .eq("customer_id", user!.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const books = (data ?? []).map((row: any) => row.books).filter(Boolean).map(mapBookRowToCard);

  return (
    <div>
      <h1 className="font-heading text-2xl leading-tight">Wishlist</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {books.length} {books.length === 1 ? "book" : "books"} saved
      </p>

      {books.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Heart className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">Your wishlist is empty.</p>
          <Button variant="outline" className="mt-2" asChild>
            <Link href="/search">Browse Books</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3">
          {books.map((book, i) => (
            <Reveal key={book.id} index={i % 8}>
              <ProductCard book={book} showWishlist inWishlist />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
