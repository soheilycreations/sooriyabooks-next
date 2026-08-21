import Image from "next/image";
import type { StoreStats } from "@/lib/catalog/queries";
import { Reveal } from "@/components/storefront/reveal";

/**
 * Real photo of the physical Sooriya Publishers store (source: the live
 * WordPress site's media library, Nov 2025) — not stock photography. Stats
 * are live catalog counts (see getStoreStats), not hardcoded figures.
 */
export function BrandStory({ stats }: { stats: StoreStats }) {
  return (
    <section className="border-t">
      <div className="container grid items-center gap-12 py-20 md:grid-cols-2 md:gap-20 md:py-32">
        <Reveal className="order-2 md:order-1">
          <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-accent">
            <span className="h-px w-8 bg-accent" aria-hidden />
            Since 1994
          </p>
          <h2 className="max-w-lg text-balance font-heading text-3xl leading-tight md:text-4xl md:leading-tight">
            An established publishing house, now a modern digital bookstore
          </h2>
          <p className="mt-5 max-w-lg leading-relaxed text-muted-foreground">
            Sooriya Publishers has spent over three decades producing and distributing
            educational and creative books across Sri Lanka — from schoolbooks to literature,
            translations to research. This storefront brings that same collection online,
            without losing the care of a shop where every shelf is chosen on purpose.
          </p>
          <dl className="mt-10 flex max-w-sm gap-10 border-t pt-8">
            <div>
              <dd className="font-heading text-4xl text-accent">{stats.bookCount.toLocaleString()}+</dd>
              <dt className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Titles in print</dt>
            </div>
            <div className="border-l pl-10">
              <dd className="font-heading text-4xl text-accent">{stats.categoryCount}</dd>
              <dt className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Categories curated</dt>
            </div>
          </dl>
        </Reveal>

        <Reveal index={1} className="order-1 md:order-2">
          <div className="relative">
            <div className="absolute -right-3 -top-3 hidden h-full w-full rounded-lg border border-accent/30 md:block" aria-hidden />
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg shadow-xl">
              <Image
                src="/brand/store-interior.jpg"
                alt="Inside the Sooriya Publishers bookstore"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
