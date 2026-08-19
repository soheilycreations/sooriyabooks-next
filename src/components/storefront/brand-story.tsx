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
    <section className="border-y bg-secondary/30">
      <div className="container grid items-center gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-24">
        <Reveal className="order-2 md:order-1">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-accent">
            Since 1994
          </p>
          <h2 className="font-heading text-3xl leading-tight md:text-4xl md:leading-tight">
            An established publishing house, now a modern digital bookstore
          </h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            Sooriya Publishers has spent over three decades producing and distributing
            educational and creative books across Sri Lanka — from schoolbooks to literature,
            translations to research. This storefront brings that same collection online,
            without losing the care of a shop where every shelf is chosen on purpose.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-6 border-t pt-6">
            <div>
              <dt className="text-sm text-muted-foreground">Titles in print</dt>
              <dd className="mt-1 font-heading text-2xl">{stats.bookCount.toLocaleString()}+</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Categories curated</dt>
              <dd className="mt-1 font-heading text-2xl">{stats.categoryCount}</dd>
            </div>
          </dl>
        </Reveal>

        <Reveal index={1} className="order-1 md:order-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
            <Image
              src="/brand/store-interior.jpg"
              alt="Inside the Sooriya Publishers bookstore"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
