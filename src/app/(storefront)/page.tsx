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
        <section id="categories" className="container py-16 md:py-24">
          <SectionHeading
            eyebrow="Browse the shelves"
            title="Find your next read"
            description="A curated slice of the collection — from schoolbooks to literature, translations to research."
          />
          <CategoryShelf categories={categories} />
        </section>
      )}

      {featured.length > 0 && (
        <section className="container py-16 md:py-24">
          <SectionHeading
            eyebrow="Handpicked"
            title="Featured Books"
            viewAllHref="/search?featured=1"
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {featured.map((book, i) => (
              <Reveal key={book.id} index={i}>
                <ProductCard book={book} showWishlist inWishlist={wishlistIds.has(book.id)} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {newArrivals.length > 0 && (
        <section className="border-y bg-secondary/30 py-16 md:py-24">
          <div className="container">
            <SectionHeading eyebrow="Just in" title="New Arrivals" viewAllHref="/search?new=1" />
          </div>
          <div className="container">
            <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {newArrivals.map((book, i) => (
                <Reveal
                  key={book.id}
                  index={i}
                  className="w-[45vw] shrink-0 snap-start sm:w-[220px]"
                >
                  <ProductCard book={book} showWishlist inWishlist={wishlistIds.has(book.id)} />
                </Reveal>
              ))}
            </div>
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
    <section className="relative overflow-hidden border-b">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/brand/store-hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
      </div>

      <div className="container flex flex-col items-start gap-6 py-20 md:py-32">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Sooriya Publishers &middot; Since 1994
          </p>
        </Reveal>
        <Reveal index={1}>
          <h1 className="max-w-xl font-heading text-4xl leading-tight text-white md:text-6xl md:leading-tight">
            The Light of Learning
          </h1>
        </Reveal>
        <Reveal index={2}>
          <p className="max-w-md text-white/85">
            Discover books that inspire, educate and stay with you — delivered to your doorstep
            across Sri Lanka.
          </p>
        </Reveal>
        <Reveal index={3}>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" variant="accent" asChild>
              <Link href="/search">Shop the Collection</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/40 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="#categories">Explore Categories</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
