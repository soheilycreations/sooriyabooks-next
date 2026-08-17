import { ProductCard } from "@/components/storefront/product-card";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

export default async function WishlistPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("wishlist_items")
    .select(
      `book_id, books ( id, title, slug, selling_price, discount_price,
        authors ( name ), book_images ( is_primary, sort_order, media_assets ( storage_path ) ) )`,
    )
    .eq("customer_id", user!.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const books = (data ?? []).map((row: any) => row.books).filter(Boolean);

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl">Wishlist</h1>
      {books.length === 0 ? (
        <p className="text-muted-foreground">Your wishlist is empty.</p>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {books.map((b) => (
            <ProductCard
              key={b.id}
              book={{
                id: b.id,
                title: b.title,
                slug: b.slug,
                sellingPrice: Number(b.selling_price),
                discountPrice: b.discount_price ? Number(b.discount_price) : null,
                authorName: b.authors?.name ?? null,
                coverUrl: null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
