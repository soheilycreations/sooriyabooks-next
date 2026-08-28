import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { CategoryShelfEntry } from "@/lib/catalog/queries";
import { Reveal } from "@/components/storefront/reveal";
import { cn } from "@/lib/utils";

/**
 * Editorial category grid — the featured category gets a large 2x2 tile;
 * the rest fill in around it (`grid-flow-dense`). Every card is filled
 * edge-to-edge with real book covers (a small grid of them, or one
 * admin-curated `imageUrl`) behind a bottom gradient carrying the title —
 * never a placeholder or generated image. `getCategoryShelfData` supplies
 * up to 6 real covers per category.
 */
export function CategoryShelf({ categories }: { categories: CategoryShelfEntry[] }) {
  if (categories.length === 0) return null;

  return (
    <div className="-mt-2 grid grid-flow-dense auto-rows-[195px] grid-cols-2 gap-3 sm:auto-rows-[215px] md:grid-cols-4 md:gap-4 md:auto-rows-[235px]">
      {categories.map((category, i) => (
        <Reveal key={category.slug} index={i} className={i === 0 ? "col-span-2 row-span-2" : undefined}>
          {i === 0 ? <FeaturedCategoryCard category={category} /> : <CategoryCard category={category} />}
        </Reveal>
      ))}
    </div>
  );
}

/** How many covers to show and how to arrange them so the grid never leaves an empty cell. */
function coverGridClass(count: number, big: boolean) {
  if (count <= 1) return "grid-cols-1 grid-rows-1";
  if (count === 2) return "grid-cols-2 grid-rows-1";
  if (count === 3) return "grid-cols-3 grid-rows-1";
  if (!big || count === 4) return "grid-cols-2 grid-rows-2";
  return "grid-cols-3 grid-rows-2";
}

/** A small grid of real covers filling its parent edge-to-edge (parent must be `relative`). */
function CoverFill({ covers, big, priority }: { covers: string[]; big?: boolean; priority?: boolean }) {
  const shown = covers.slice(0, big ? 6 : 4);
  if (shown.length === 0) return null;

  return (
    <div className={cn("absolute inset-0 grid gap-px", coverGridClass(shown.length, !!big))}>
      {shown.map((url, i) => (
        <div key={url} className="relative overflow-hidden">
          <Image
            src={url}
            alt=""
            fill
            sizes={big ? "(max-width: 768px) 50vw, 25vw" : "(max-width: 768px) 33vw, 15vw"}
            priority={priority && i === 0}
            className="object-cover transition-transform duration-500 ease-premium group-hover:scale-105"
          />
        </div>
      ))}
    </div>
  );
}

/** Monogram fallback for the rare category with no curated image and no covered books yet. */
function EmptyFill({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-brand-tint/70">
      <span aria-hidden className="select-none font-heading text-7xl text-accent/10">
        {name.charAt(0)}
      </span>
    </div>
  );
}

/** The large featured tile — a full-bleed cover image or grid, title/count/CTA on a bottom scrim. */
function FeaturedCategoryCard({ category }: { category: CategoryShelfEntry }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/70 transition-shadow duration-300 ease-premium hover:shadow-xl"
    >
      {category.imageUrl ? (
        <Image
          src={category.imageUrl}
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="absolute inset-0 object-cover transition-transform duration-500 ease-premium group-hover:scale-105"
        />
      ) : category.coverUrls.length > 0 ? (
        <CoverFill covers={category.coverUrls} big priority />
      ) : (
        <EmptyFill name={category.name} />
      )}

      {/* Darkest at the bottom, where the title sits, fading out toward the
          top so the covers still read clearly above the text. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

      <div className="relative z-10 mt-auto flex items-end justify-between gap-4 p-6 md:p-7">
        <div>
          <p className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
            <span className="h-px w-6 bg-accent/70" aria-hidden />
            {category.name}
          </p>
          <p className="font-heading text-2xl leading-snug text-white md:text-3xl">{category.name}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-white/70">
            {category.bookCount} {category.bookCount === 1 ? "title" : "titles"}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium uppercase tracking-wide text-white transition-transform duration-300 ease-premium group-hover:translate-x-1">
          Explore collection
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

/** A smaller shelf card — same full-bleed treatment as the featured tile, scaled down. */
function CategoryCard({ category }: { category: CategoryShelfEntry }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border/70 transition-all duration-300 ease-premium hover:border-accent/50 hover:shadow-lg"
    >
      {category.imageUrl ? (
        <Image
          src={category.imageUrl}
          alt=""
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="absolute inset-0 object-cover transition-transform duration-500 ease-premium group-hover:scale-105"
        />
      ) : category.coverUrls.length > 0 ? (
        <CoverFill covers={category.coverUrls} />
      ) : (
        <EmptyFill name={category.name} />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      <div className="relative z-10 mt-auto flex items-end justify-between gap-2 p-3 md:p-4">
        <div>
          <p className="font-heading text-base leading-snug text-white md:text-lg">{category.name}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-white/70">
            {category.bookCount} {category.bookCount === 1 ? "title" : "titles"}
          </p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-white/60 transition-all duration-300 ease-premium group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
    </Link>
  );
}
