import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { HeroSlider } from "@/components/storefront/hero-slider";
import { SectionHeading } from "@/components/storefront/section-heading";
import { CategoryShelf } from "@/components/storefront/category-shelf";
import { BrandStory } from "@/components/storefront/brand-story";
import { Testimonials } from "@/components/storefront/testimonials";
import { FinalCta } from "@/components/storefront/final-cta";
import { Reveal } from "@/components/storefront/reveal";
import { NewArrivalsCarousel } from "@/components/storefront/new-arrivals-carousel";
import {
  getFeaturedBooks,
  getNewArrivals,
  getCategoryShelfData,
  getStoreStats,
} from "@/lib/catalog/queries";
import { getActiveHeroSlides } from "@/lib/content/queries";
import { getWishlistBookIds } from "@/lib/customers/wishlist-actions";

export const revalidate = 3600; // ISR: catalog/homepage changes invalidate via revalidateTag in admin actions

export default async function HomePage() {
  const [featured, newArrivals, slides, categories, stats, wishlistIds] = await Promise.all([
    getFeaturedBooks(8),
    getNewArrivals(8),
    getActiveHeroSlides(),
    // 5, not 6: the shelf's first tile spans 2x2 in a 4-col grid, so the
    // remaining tiles must be a multiple of 4 to tile evenly (4 here) —
    // 6 total left a 6th tile stranded alone in an otherwise-empty row.
    getCategoryShelfData(5),
    getStoreStats(),
    getWishlistBookIds(),
  ]);

  const catalogEmpty = featured.length === 0 && newArrivals.length === 0;

  return (
    <div>
      {slides.length > 0 ? <HeroSlider slides={slides} /> : <FallbackHero />}

      {categories.length > 0 && (
        <section id="categories" className="container py-16 md:py-28">
          <SectionHeading
            eyebrow="Browse the shelves"
            title="Find your next read"
            description="A curated slice of the collection — from schoolbooks to literature, translations to research."
          />
          <CategoryShelf categories={categories} />
        </section>
      )}

      {featured.length > 0 && (
        <section className="container py-16 md:py-28">
          <SectionHeading eyebrow="Handpicked" title="Featured Books" viewAllHref="/search?featured=1" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
            {featured.map((book, i) => (
              <Reveal key={book.id} index={i}>
                <ProductCard book={book} showWishlist inWishlist={wishlistIds.has(book.id)} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {newArrivals.length > 0 && (
        <section className="border-y bg-secondary/30 py-16 md:py-28">
          <div className="container">
            <SectionHeading eyebrow="Just in" title="New Arrivals" viewAllHref="/search?new=1" />
          </div>
          <div className="container">
            <NewArrivalsCarousel books={newArrivals} wishlistIds={wishlistIds} />
          </div>
        </section>
      )}

      {catalogEmpty && (
        <section className="container py-24 text-center text-muted-foreground">
          <p>
            The catalog is empty — books added in the admin panel (or imported via the migration
            script, see docs/migration-plan.md) will appear here automatically.
          </p>
        </section>
      )}

      <BrandStory stats={stats} />
      <Testimonials />
      <FinalCta />
    </div>
  );
}

function FallbackHero() {
  return (
    <section className="relative overflow-hidden border-b bg-secondary/20">
      <div className="container py-14 md:py-20 lg:py-24">
        <div className="grid gap-10 md:grid-cols-[45%_minmax(0,1fr)] md:items-center md:gap-14 lg:gap-20">
          <div>
            <Reveal>
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-accent">
                <span className="h-px w-8 bg-accent" aria-hidden />
                Sooriya Publishers &middot; Since 1994
              </p>
            </Reveal>
            <Reveal index={1}>
              <h1 className="mt-4 max-w-lg text-balance font-heading text-4xl leading-[1.1] tracking-tight md:text-5xl lg:text-6xl lg:leading-[1.08]">
                Discover Your Next Great Read.
              </h1>
            </Reveal>
            <Reveal index={2}>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
                Explore books from Sooriya Publishers, including fiction, non-fiction, academic,
                children&apos;s and translated books, with delivery across Sri Lanka.
              </p>
            </Reveal>
            <Reveal index={3}>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  variant="accent"
                  asChild
                  className="px-8 shadow-md shadow-accent/20 transition-transform duration-300 ease-premium hover:scale-[1.02]"
                >
                  <Link href="/search">Shop All Books</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#categories">Explore Categories</Link>
                </Button>
              </div>
            </Reveal>
          </div>

          <Reveal index={1}>
            <div className="relative mx-auto max-w-md md:max-w-none">
              <div
                className="absolute -inset-3 -z-10 hidden rounded-2xl border border-accent/30 md:block"
                aria-hidden
              />
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl shadow-xl sm:aspect-[6/5] md:aspect-[4/5]">
                <Image
                  src="/brand/store-hero.jpg"
                  alt="Sooriya Publishers bookstore in Sri Lanka"
                  fill
                  priority
                  sizes="(max-width: 768px) 90vw, 45vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute bottom-4 left-4 rounded-lg border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:bottom-5 sm:left-5 sm:px-5 sm:py-4">
                <p className="font-heading text-base leading-none sm:text-lg">Since 1994</p>
                <p className="mt-1 text-xs text-muted-foreground">Over three decades of publishing</p>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal index={4}>
          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-6 text-sm text-muted-foreground md:mt-14">
            <span>Since 1994</span>
            <span className="h-1 w-1 rounded-full bg-accent/60" aria-hidden />
            <span>Authentic Books</span>
            <span className="h-1 w-1 rounded-full bg-accent/60" aria-hidden />
            <span>Islandwide Delivery</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
