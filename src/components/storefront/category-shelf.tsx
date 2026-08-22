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
 */
export function CategoryShelf({ categories }: { categories: CategoryShelfEntry[] }) {
  if (categories.length === 0) return null;

  return (
    <div className="grid grid-flow-dense auto-rows-[190px] grid-cols-2 gap-3 sm:auto-rows-[210px] md:grid-cols-4 md:gap-4 md:auto-rows-[230px]">
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

/** A single cover, framed like a physical book — white border, soft shadow — never stretched. */
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
    <div className={cn("relative aspect-[2/3] overflow-hidden rounded-sm border-2 border-white shadow-md", className)}>
      <Image src={url} alt="" fill sizes={sizes} className="object-cover" priority={priority} />
    </div>
  );
}

/**
 * The large "Sooriya books" feature card — real covers displayed like books
 * fanned on an editorial surface (one dominant and upright, two or three
 * more layered behind it at a few degrees of tilt), on a warm cream field.
 * Title, count and CTA sit in their own clean strip; nothing is stamped
 * over the imagery.
 */
function FeaturedCategoryCard({ category }: { category: CategoryShelfEntry }) {
  const covers = category.imageUrl ? [] : category.coverUrls.slice(0, 4);

  return (
    <Link
      href={`/category/${category.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-brand-50/70 transition-shadow duration-300 ease-premium hover:shadow-xl"
    >
      {category.imageUrl ? (
        <div className="relative flex-1 p-6 md:p-8">
          <CoverFrame
            url={category.imageUrl}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="mx-auto h-full w-auto shadow-lg transition-transform duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.02]"
          />
        </div>
      ) : covers.length > 0 ? (
        <div className="relative flex-1 px-6 pt-8 md:px-8 md:pt-10">
          {/* Extremely subtle oversized initial, sitting behind the book
              composition — an editorial texture detail, not a focal element. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-2 -top-4 select-none font-heading text-[9rem] leading-none text-foreground/[0.04] md:text-[11rem]"
          >
            {category.name.charAt(0)}
          </span>

          <div className="relative mx-auto h-full max-w-[300px]">
            {covers[3] && (
              <div className="absolute bottom-0 right-[6%] z-[5] w-[20%]" style={{ transform: "rotate(4deg)" }}>
                <CoverFrame
                  url={covers[3]}
                  sizes="90px"
                  className="shadow-sm transition-transform duration-500 ease-premium group-hover:translate-y-[-2px]"
                />
              </div>
            )}
            {covers[1] && (
              <div className="absolute left-[6%] top-[10%] z-10 w-[27%]" style={{ transform: "rotate(-4deg)" }}>
                <CoverFrame
                  url={covers[1]}
                  sizes="120px"
                  className="transition-transform duration-500 ease-premium group-hover:-translate-y-1"
                />
              </div>
            )}
            {covers[2] && (
              <div className="absolute right-[8%] top-[6%] z-10 w-[24%]" style={{ transform: "rotate(3deg)" }}>
                <CoverFrame
                  url={covers[2]}
                  sizes="110px"
                  className="transition-transform duration-500 ease-premium group-hover:-translate-y-1"
                />
              </div>
            )}
            {covers[0] && (
              <div className="absolute left-1/2 top-0 z-20 w-[40%] -translate-x-1/2">
                <CoverFrame
                  url={covers[0]}
                  sizes="160px"
                  priority
                  className="shadow-xl transition-transform duration-500 ease-premium group-hover:-translate-y-2 group-hover:scale-[1.03]"
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

      <div className="relative z-30 flex items-end justify-between gap-4 border-t border-border/60 bg-brand-50 px-6 py-5 md:px-7 md:py-6">
        <div>
          <p className="mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
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
  "group relative flex h-full flex-col justify-between overflow-hidden rounded-lg border border-border/70 p-4 transition-all duration-300 ease-premium hover:border-accent/50 hover:shadow-lg md:p-5";

function CardMeta({ category }: { category: CategoryShelfEntry }) {
  return (
    <div className="relative mt-3 flex items-end justify-between gap-2">
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
    <div className="relative flex flex-1 items-center justify-center">
      <span
        aria-hidden
        className="select-none font-heading text-6xl text-accent/10 transition-colors duration-300 ease-premium group-hover:text-accent/20"
      >
        {name.charAt(0)}
      </span>
    </div>
  );
}

/**
 * A smaller shelf card — real covers displayed as physical objects (never a
 * stretched background). `variant` rotates through three distinct editorial
 * compositions so the row of cards doesn't repeat itself:
 *   0 — two covers side by side, the second tucked slightly behind the first
 *   1 — one dominant cover with a smaller one floating at its corner
 *   2 — a mini shelf of up to three small covers, staggered like a shelf
 * Each degrades gracefully to fewer covers if the category doesn't have
 * enough distinct ones yet.
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
  const bg = tint ? "bg-secondary/50" : "bg-brand-50/60";

  if (category.imageUrl) {
    return (
      <Link href={`/category/${category.slug}`} className={cn(cardShell, bg)}>
        <div className="relative flex flex-1 items-center justify-center">
          <CoverFrame
            url={category.imageUrl}
            sizes="(max-width: 768px) 50vw, 25vw"
            className="h-full w-auto shadow-lg transition-transform duration-300 ease-premium group-hover:-translate-y-1.5 group-hover:scale-[1.03]"
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
        <div className="relative flex flex-1 items-center justify-center">
          {covers[1] && (
            <CoverFrame
              url={covers[1]}
              sizes="90px"
              className="z-10 -mr-5 w-16 -rotate-3 shadow-sm transition-transform duration-300 ease-premium group-hover:-translate-y-1 group-hover:-rotate-6 sm:w-[72px] md:w-20"
            />
          )}
          <CoverFrame
            url={primaryCover}
            sizes="100px"
            priority
            className="relative z-20 w-20 rotate-2 shadow-lg transition-transform duration-300 ease-premium group-hover:-translate-y-1.5 group-hover:scale-[1.03] sm:w-[88px] md:w-24"
          />
        </div>
      )}

      {variant === 1 && (
        <div className="relative flex flex-1 items-center justify-center">
          <CoverFrame
            url={primaryCover}
            sizes="110px"
            priority
            className="relative z-20 w-[88px] shadow-lg transition-transform duration-300 ease-premium group-hover:-translate-y-1.5 group-hover:scale-[1.03] sm:w-24 md:w-[104px]"
          />
          {covers[1] && (
            <CoverFrame
              url={covers[1]}
              sizes="60px"
              className="absolute bottom-1 right-4 z-10 w-11 rotate-[5deg] shadow-md transition-transform duration-300 ease-premium group-hover:-translate-y-1 sm:w-12 md:right-5 md:w-14"
            />
          )}
        </div>
      )}

      {variant === 2 && (
        <div className="relative flex flex-1 items-end justify-center gap-1.5 pb-1">
          {covers.slice(0, 3).map((url, idx) => (
            <CoverFrame
              key={url}
              url={url}
              sizes="60px"
              priority={idx === 0}
              className={cn(
                "w-[52px] shadow-sm transition-transform duration-300 ease-premium group-hover:-translate-y-1 sm:w-14 md:w-[60px]",
                idx === 0 && "-rotate-3 mb-1.5",
                idx === 1 && "rotate-1",
                idx === 2 && "rotate-3 mb-1",
              )}
            />
          ))}
        </div>
      )}

      <CardMeta category={category} />
    </Link>
  );
}
