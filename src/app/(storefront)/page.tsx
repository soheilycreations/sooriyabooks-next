import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { HeroSlider } from "@/components/storefront/hero-slider";
import { HeroParallaxImage } from "@/components/storefront/hero-parallax-image";
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
    // 9, not 10: the shelf's featured tile spans 2x2 in a 4-col grid (4
    // cells), so the remaining tiles must be a multiple of 4 to tile evenly
    // — 8 here gives exactly 3 full rows with the featured tile included.
    getCategoryShelfData(9),
    getStoreStats(),
    getWishlistBookIds(),
  ]);

  const catalogEmpty = featured.length === 0 && newArrivals.length === 0;

  return (
    <div>
      {slides.length > 0 ? <HeroSlider slides={slides} /> : <FallbackHero />}

      {categories.length > 0 && (
        // Tighter top padding than the sections below — the hero already
        // ends on a border, so this reads as a direct continuation of it
        // rather than a new section separated by a block of empty space.
        <section id="categories" className="container pb-16 pt-10 md:pb-28 md:pt-14">
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
    <section className="relative isolate overflow-hidden border-b">
      <HeroParallaxImage src="/brand/store-hero.jpg" alt="Sooriya Publishers bookstore in Sri Lanka" />
      {/* Overlay is left-weighted and fairly light — just enough for the text
          to read clearly without flattening the photo into a dark backdrop. */}
      <div className="absolute inset-0 -z-[5] bg-gradient-to-r from-black/70 via-black/35 to-black/5" />
      <div className="absolute inset-0 -z-[5] bg-gradient-to-t from-black/30 via-transparent to-transparent" />

      <div className="container relative flex min-h-[70vh] flex-col justify-center gap-5 py-16 md:min-h-[75vh] lg:min-h-[80vh]">
        <Reveal>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-accent">
            <span className="h-px w-8 bg-accent" aria-hidden />
            Sooriya Publishers &middot; Since 1994
          </p>
        </Reveal>
        <Reveal index={1}>
          <h1 className="max-w-2xl text-balance font-heading text-4xl leading-[1.08] tracking-tight text-white md:text-6xl lg:text-7xl lg:leading-[1.05]">
            Discover Your Next Great Read.
          </h1>
        </Reveal>
        <Reveal index={2}>
          <p className="max-w-md text-base leading-relaxed text-white/85 md:text-lg">
            Explore books from Sooriya Publishers, including fiction, non-fiction, academic,
            children&apos;s and translated books, with delivery across Sri Lanka.
          </p>
        </Reveal>
        <Reveal index={3}>
          <div className="mt-2 flex flex-wrap gap-3">
            <Button
              size="lg"
              variant="accent"
              asChild
              className="px-8 shadow-md shadow-accent/20 transition-transform duration-300 ease-premium hover:scale-[1.02]"
            >
              <Link href="/search">Shop All Books</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/40 bg-transparent text-white transition-colors hover:bg-white/10"
            >
              <Link href="#categories">Explore Categories</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
