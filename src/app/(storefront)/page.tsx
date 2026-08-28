import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { HeroSlider } from "@/components/storefront/hero-slider";
import { HeroCoverMosaic } from "@/components/storefront/hero-cover-mosaic";
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
  getBooksByCategory,
  getCategoryShelfData,
  getStoreStats,
  getRandomBookCovers,
} from "@/lib/catalog/queries";
import { getActiveHeroSlides } from "@/lib/content/queries";
import { getWishlistBookIds } from "@/lib/customers/wishlist-actions";

export const revalidate = 3600; // ISR: catalog/homepage changes invalidate via revalidateTag in admin actions

export default async function HomePage() {
  const [featured, newArrivals, sooriyaBooks, pastPapers, slides, categories, stats, wishlistIds] = await Promise.all([
    getFeaturedBooks(8),
    getNewArrivals(8),
    // Real books from the publisher's own "Sooriya Books" imprint category —
    // same slug the category shelf's featured tile links to.
    getBooksByCategory("sooriya-books", { limit: 14 }),
    // Real "Past & Model Papers" category — the reference site has the same
    // section. Note: the catalog has a second, near-duplicate category
    // ("past-model-papers-1", 32 books vs this one's 23) left over from the
    // WordPress migration; using the primary slug here, but the duplicate
    // is worth cleaning up in the admin panel at some point.
    getBooksByCategory("past-model-papers", { limit: 14 }),
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

      {sooriyaBooks.books.length > 0 && (
        // Solid cream, not white — the first beat of color right after the
        // hero photo, instead of dropping straight into a blank page.
        <section className="bg-brand-tint/80">
          {/* Same tight top padding as the categories section below — sits
              directly against the hero, not separated by empty space — and a
              small bottom padding since the categories section right after it
              already brings its own top padding. */}
          <div className="container pb-2 pt-8 md:pb-4 md:pt-10">
            <SectionHeading
              eyebrow="Since 1994"
              title="Sooriya Books"
              viewAllHref="/category/sooriya-books"
              viewAllLabel="See all books"
            />
            <NewArrivalsCarousel books={sooriyaBooks.books} wishlistIds={wishlistIds} />
          </div>
        </section>
      )}

      {categories.length > 0 && (
        // A solid warm-gray field — distinct from the cream section above it
        // and the white one below, not just a faint tint that reads as
        // "still basically white."
        <section id="categories" className="bg-secondary">
          {/* Tighter top padding than the sections below — the hero already
              ends on a border, so this reads as a direct continuation of it
              rather than a new section separated by a block of empty space. */}
          <div className="container pb-6 pt-8 md:pb-10 md:pt-10">
            <SectionHeading
              eyebrow="Browse the shelves"
              title="Find your next read"
              description="A curated slice of the collection — from schoolbooks to literature, translations to research."
            />
            <CategoryShelf categories={categories} />
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="container py-10 md:py-16">
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
        // Cream again here — alternating cream/warm-gray/white/cream/... down
        // the page reads as a deliberate rhythm rather than a repeat of the
        // section right above it.
        <section className="border-y bg-brand-tint/80 py-10 md:py-16">
          <div className="container">
            <SectionHeading eyebrow="Just in" title="New Arrivals" viewAllHref="/search?new=1" />
          </div>
          <div className="container">
            <NewArrivalsCarousel books={newArrivals} wishlistIds={wishlistIds} />
          </div>
        </section>
      )}

      {pastPapers.books.length > 0 && (
        // Warm-gray, continuing the cream/gray/white rhythm established
        // above (New Arrivals is cream, this is gray, brand story below is
        // white) rather than repeating the section right before it.
        <section className="bg-secondary py-10 md:py-16">
          <div className="container">
            <SectionHeading
              eyebrow="Exam Season"
              title="Past Papers & Model Papers"
              viewAllHref="/category/past-model-papers"
              viewAllLabel="See all books"
            />
            <NewArrivalsCarousel books={pastPapers.books} wishlistIds={wishlistIds} />
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

async function FallbackHero() {
  // A wall of real covers — every tile is a genuine catalog book (see
  // getRandomBookCovers). Fetched much larger than what's shown at once
  // (see HeroCoverMosaic's VISIBLE_COUNT) so tiles have a deep pool of
  // fresh covers to keep rotating through client-side, without refetching.
  const covers = await getRandomBookCovers(90);

  return (
    <section className="relative isolate overflow-hidden border-b">
      <HeroCoverMosaic covers={covers} />
      {/* Lighter than a flat wash so the covers still read with real color —
          darker toward the bottom (behind the buttons) than the middle
          (behind "Welcome"), rather than one flat scrim over everything. */}
      <div className="absolute inset-0 -z-[5] bg-gradient-to-b from-black/45 via-black/35 to-black/55" />

      <div className="container relative flex min-h-[85vh] flex-col items-center justify-center gap-4 py-16 text-center md:min-h-screen">
        <Reveal>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-accent">
            <span className="h-px w-8 bg-accent" aria-hidden />
            Sooriya Publishers &middot; Since 1994
            <span className="h-px w-8 bg-accent" aria-hidden />
          </p>
        </Reveal>
        <Reveal index={1}>
          <h1 className="text-balance font-heading text-7xl leading-none tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)] md:text-9xl">
            Welcome
          </h1>
        </Reveal>
        <Reveal index={2}>
          <p className="text-lg tracking-wide text-accent md:text-xl">sooriya online bookstore</p>
        </Reveal>
        <Reveal index={3}>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
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
