import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { HeroSlider } from "@/components/storefront/hero-slider";
import { getFeaturedBooks, getNewArrivals } from "@/lib/catalog/queries";
import { getActiveHeroSlides } from "@/lib/content/queries";

export const revalidate = 3600; // ISR: catalog/homepage changes invalidate via revalidateTag in admin actions

export default async function HomePage() {
  const [featured, newArrivals, slides] = await Promise.all([
    getFeaturedBooks(8),
    getNewArrivals(8),
    getActiveHeroSlides(),
  ]);

  return (
    <div>
      {slides.length > 0 ? (
        <HeroSlider slides={slides} />
      ) : (
        <section className="border-b bg-secondary/30">
          <div className="container flex flex-col items-start gap-6 py-20 md:py-28">
            <p className="text-sm font-medium uppercase tracking-widest text-accent">
              Since 1994 &middot; Sri Lanka
            </p>
            <h1 className="max-w-2xl font-heading text-4xl leading-tight md:text-6xl">
              Buy Books to your Doorstep
            </h1>
            <p className="max-w-lg text-muted-foreground">
              Sooriya Publishers is Sri Lanka&apos;s trusted publishing and distribution company —
              island-wide delivery, curated titles, and a modern shopping experience.
            </p>
            <Button size="lg" variant="accent" asChild>
              <Link href="/search">Shop the Collection</Link>
            </Button>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="container py-16">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-heading text-3xl">Featured Books</h2>
            <Link href="/search?featured=1" className="text-sm text-accent hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {featured.map((book) => (
              <ProductCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {newArrivals.length > 0 && (
        <section className="container py-16">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-heading text-3xl">New Arrivals</h2>
            <Link href="/search?new=1" className="text-sm text-accent hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {newArrivals.map((book) => (
              <ProductCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {featured.length === 0 && newArrivals.length === 0 && (
        <section className="container py-24 text-center text-muted-foreground">
          <p>
            The catalog is empty — books added in the admin panel (or imported via the migration
            script, see docs/migration-plan.md) will appear here automatically.
          </p>
        </section>
      )}
    </div>
  );
}
