import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { CategoryShelfEntry } from "@/lib/catalog/queries";
import { Reveal } from "@/components/storefront/reveal";
import { cn } from "@/lib/utils";

/**
 * Editorial "library shelf" grid — the featured category gets a large,
 * physical-book composition; the rest fill in around it (`grid-flow-dense`)
 * cycling through three distinct editorial layouts (overlapping pair,
 * dominant + floating, mini shelf) so the row never reads as repeated,
 * identical cards. Every cover shown is real: `getCategoryShelfData`
 * supplies actual book covers from Supabase (or an admin-curated
 * `imageUrl`), never placeholder or generated art. Deliberately avoids a
 * full-bleed cover + dark gradient + overlaid title anywhere in this
 * section — covers are shown as bordered, shadowed objects on a cream
 * field, not stretched backgrounds.
 *
 * Every cover is sized by HEIGHT (`h-[n%]` + `w-auto`, never a fixed width)
 * inside an image zone that is `flex-1 min-h-0 overflow-hidden`. That's
 * deliberate: a fixed-width cover locks in a fixed pixel height via its
 * aspect ratio, which can exceed the card's actual available space and
 * push the title/count row past the card's visible bottom edge, silently
 * clipping it. Sizing by a percentage of the (capped) image zone means
 * covers always fit the space that's actually there, at any card height.
 */
export function CategoryShelf({ categories }: { categories: CategoryShelfEntry[] }) {
  if (categories.length === 0) return null;

  return (
    <div className="-mt-2 grid grid-flow-dense auto-rows-[195px] grid-cols-2 gap-3 sm:auto-rows-[215px] md:grid-cols-4 md:gap-4 md:auto-rows-[235px]">
      {categories.map((category, i) => (
        <Reveal key={category.slug} index={i} className={i === 0 ? "col-span-2 row-span-2" : undefined}>
          {i === 0 ? (
            <FeaturedCategoryCard category={category} />
          ) : (
            <CategoryCard category={category} tint={i % 2 === 1} variant={((i - 1) % 3) as 0 | 1 | 2} />
          )}
        </Reveal>
      ))}
    </div>
  );
}

/** A single cover, framed like a physical book — white border, soft shadow — never stretched. Always sized by height so it can never force its container to overflow. */
function CoverFrame({
  url,
  className,
  sizes,
  priority,
}: {
  url: string;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[2/3] w-auto shrink-0 overflow-hidden rounded-sm border-2 border-white shadow-md",
        className,
      )}
    >
      <Image src={url} alt="" fill sizes={sizes} className="object-cover" priority={priority} />
    </div>
  );
}

/**
 * The large "Sooriya books" feature card — real covers displayed like books
 * fanned on an editorial surface, sized to fill roughly the upper 70-75% of
 * the card. Title, count and CTA sit in a compact bottom strip that is
 * `shrink-0` — it always renders at full size, never squeezed or clipped by
 * the image composition above it.
 */
function FeaturedCategoryCard({ category }: { category: CategoryShelfEntry }) {
  const covers = category.imageUrl ? [] : category.coverUrls.slice(0, 4);

  return (
    <Link
      href={`/category/${category.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-brand-tint/70 transition-shadow duration-300 ease-premium hover:shadow-xl"
    >
      {category.imageUrl ? (
        <div className="relative min-h-0 flex-1 overflow-hidden p-4 md:p-5">
          <CoverFrame
            url={category.imageUrl}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="mx-auto h-full shadow-lg transition-transform duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.02]"
          />
        </div>
      ) : covers.length > 0 ? (
        <div className="relative min-h-0 flex-1 overflow-hidden px-6 pt-4 md:px-8 md:pt-5">
          {/* Extremely subtle oversized initial, sitting behind the book
              composition — an editorial texture detail, not a focal element. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-2 -top-4 select-none font-heading text-[9rem] leading-none text-foreground/[0.04] md:text-[11rem]"
          >
            {category.name.charAt(0)}
          </span>

          <div className="relative mx-auto h-full w-full max-w-[460px]">
            {covers[3] && (
              <div className="absolute bottom-0 right-0 z-[5] h-[56%]" style={{ transform: "rotate(4deg)" }}>
                <CoverFrame
                  url={covers[3]}
                  sizes="130px"
                  className="h-full shadow-sm transition-transform duration-500 ease-premium group-hover:translate-y-[-2px]"
                />
              </div>
            )}
            {covers[1] && (
              <div className="absolute left-0 top-[2%] z-10 h-[82%]" style={{ transform: "rotate(-4deg)" }}>
                <CoverFrame
                  url={covers[1]}
                  sizes="200px"
                  className="h-full transition-transform duration-500 ease-premium group-hover:-translate-y-1"
                />
              </div>
            )}
            {covers[2] && (
              <div className="absolute right-0 top-0 z-10 h-[76%]" style={{ transform: "rotate(3deg)" }}>
                <CoverFrame
                  url={covers[2]}
                  sizes="180px"
                  className="h-full transition-transform duration-500 ease-premium group-hover:-translate-y-1"
                />
              </div>
            )}
            {covers[0] && (
              <div className="absolute left-1/2 top-0 z-20 h-full -translate-x-1/2">
                <CoverFrame
                  url={covers[0]}
                  sizes="240px"
                  priority
                  className="h-full shadow-xl transition-transform duration-500 ease-premium group-hover:-translate-y-3 group-hover:scale-[1.07] group-hover:shadow-2xl"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <span aria-hidden className="select-none font-heading text-8xl text-accent/10">
            {category.name.charAt(0)}
          </span>
        </div>
      )}

      <div className="relative z-30 flex shrink-0 items-end justify-between gap-4 border-t border-border/60 bg-brand-tint px-6 py-4 md:px-7 md:py-5">
        <div>
          <p className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
            <span className="h-px w-6 bg-accent/70" aria-hidden />
            {category.name}
          </p>
          <p className="font-heading text-2xl leading-snug text-foreground md:text-3xl">{category.name}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {category.bookCount} {category.bookCount === 1 ? "title" : "titles"}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium uppercase tracking-wide text-accent transition-transform duration-300 ease-premium group-hover:translate-x-1">
          Explore collection
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

const cardShell =
  "group relative flex h-full flex-col overflow-hidden rounded-lg border border-border/70 p-2.5 transition-all duration-300 ease-premium hover:border-accent/50 hover:shadow-lg md:p-3";

/** Title/count row — always `shrink-0` so it renders at full, un-clipped size regardless of how much room the cover composition above it wants. */
function CardMeta({ category }: { category: CategoryShelfEntry }) {
  return (
    <div className="relative mt-2 flex shrink-0 items-end justify-between gap-2">
      <div>
        <p className="font-heading text-base leading-snug text-foreground md:text-lg">{category.name}</p>
        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          {category.bookCount} {category.bookCount === 1 ? "title" : "titles"}
        </p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-foreground/30 transition-all duration-300 ease-premium group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
    </div>
  );
}

/** Monogram fallback for the rare category with no curated image and no covered books yet. */
function EmptyGlyph({ name }: { name: string }) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <span
        aria-hidden
        className="absolute inset-0 flex select-none items-center justify-center font-heading text-6xl text-accent/10 transition-colors duration-300 ease-premium group-hover:text-accent/20"
      >
        {name.charAt(0)}
      </span>
    </div>
  );
}

/**
 * A smaller shelf card — real covers sized to fill roughly 65-75% of the
 * card's visual area, displayed as physical objects (never a stretched
 * background). `variant` rotates through three distinct editorial
 * compositions so the row of cards doesn't repeat itself:
 *   0 — two covers overlapping, the second tucked behind the first
 *   1 — one dominant cover with a smaller one floating at its corner
 *   2 — a mini shelf of up to three covers, staggered like a shelf
 * The image zone is `flex-1 min-h-0 overflow-hidden` and every cover is
 * sized by height (see `CoverFrame`), so however large the composition
 * gets, it can never push the title/count row below the card's visible
 * edge — that row is `shrink-0` and always renders in full.
 */
function CategoryCard({
  category,
  tint,
  variant,
}: {
  category: CategoryShelfEntry;
  /** Alternates the card field so a row of them doesn't read as identical,
   *  repeated tiles. */
  tint: boolean;
  variant: 0 | 1 | 2;
}) {
  const bg = tint ? "bg-secondary/50" : "bg-brand-tint/60";

  if (category.imageUrl) {
    return (
      <Link href={`/category/${category.slug}`} className={cn(cardShell, bg)}>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <CoverFrame
            url={category.imageUrl}
            sizes="(max-width: 768px) 50vw, 25vw"
            className="h-full shadow-lg transition-transform duration-300 ease-premium group-hover:-translate-y-2 group-hover:scale-[1.07] group-hover:shadow-2xl"
          />
        </div>
        <CardMeta category={category} />
      </Link>
    );
  }

  const covers = category.coverUrls;
  if (covers.length === 0) {
    return (
      <Link href={`/category/${category.slug}`} className={cn(cardShell, bg)}>
        <EmptyGlyph name={category.name} />
        <CardMeta category={category} />
      </Link>
    );
  }
  // Guaranteed by the length check above — TS's noUncheckedIndexedAccess
  // can't see that across the early return, so this is a known-safe assertion.
  const primaryCover = covers[0] as string;

  return (
    <Link href={`/category/${category.slug}`} className={cn(cardShell, bg)}>
      {variant === 0 && (
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          {covers[2] && (
            <CoverFrame
              url={covers[2]}
              sizes="110px"
              className="z-[5] -mr-6 h-[70%] rotate-6 shadow-sm transition-transform duration-300 ease-premium group-hover:-translate-y-1 group-hover:rotate-[10deg]"
            />
          )}
          {covers[1] && (
            <CoverFrame
              url={covers[1]}
              sizes="130px"
              className="z-10 -mr-4 h-[84%] -rotate-3 shadow-sm transition-transform duration-300 ease-premium group-hover:-translate-y-1.5 group-hover:-rotate-6 group-hover:scale-[1.04]"
            />
          )}
          <CoverFrame
            url={primaryCover}
            sizes="150px"
            priority
            className="relative z-20 h-full rotate-2 shadow-lg transition-transform duration-300 ease-premium group-hover:-translate-y-2 group-hover:scale-[1.08] group-hover:shadow-2xl"
          />
        </div>
      )}

      {variant === 1 && (
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <CoverFrame
            url={primaryCover}
            sizes="160px"
            priority
            className="relative z-20 h-full shadow-lg transition-transform duration-300 ease-premium group-hover:-translate-y-2 group-hover:scale-[1.08] group-hover:shadow-2xl"
          />
          {covers[1] && (
            <CoverFrame
              url={covers[1]}
              sizes="100px"
              className="absolute bottom-0 right-0 z-10 h-[64%] rotate-[6deg] shadow-md transition-transform duration-300 ease-premium group-hover:-translate-y-1.5 group-hover:scale-[1.05]"
            />
          )}
          {covers[2] && (
            <CoverFrame
              url={covers[2]}
              sizes="80px"
              className="absolute left-0 top-0 z-10 h-[46%] -rotate-[8deg] shadow-sm transition-transform duration-300 ease-premium group-hover:-translate-y-1"
            />
          )}
        </div>
      )}

      {variant === 2 && (
        <div className="relative flex min-h-0 flex-1 items-end justify-center gap-1 overflow-hidden">
          {covers.slice(0, 4).map((url, idx) => (
            <CoverFrame
              key={url}
              url={url}
              sizes="100px"
              priority={idx === 0}
              className={cn(
                "shadow-sm transition-transform duration-300 ease-premium group-hover:-translate-y-1.5 group-hover:scale-[1.06] group-hover:shadow-lg",
                idx === 0 && "h-[74%] -rotate-3",
                idx === 1 && "h-[92%] rotate-1",
                idx === 2 && "h-[82%] rotate-3",
                idx === 3 && "h-[68%] -rotate-2",
              )}
            />
          ))}
        </div>
      )}

      <CardMeta category={category} />
    </Link>
  );
}
