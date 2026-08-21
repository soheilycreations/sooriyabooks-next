import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CategoryShelfEntry } from "@/lib/catalog/queries";
import { Reveal } from "@/components/storefront/reveal";
import { cn } from "@/lib/utils";

/**
 * Editorial "library shelf" grid — the first category gets a large tile,
 * the rest fill in around it (`grid-flow-dense`), so it doesn't read as a
 * repeated row of identical cards. Categories with a real `image_url` get a
 * photographic tile; ones without (most of this catalog, per the WooCommerce
 * import) get a typography-forward tile instead — the variation is driven by
 * what data actually exists, not styled arbitrarily.
 */
export function CategoryShelf({ categories }: { categories: CategoryShelfEntry[] }) {
  if (categories.length === 0) return null;

  return (
    <div className="grid grid-flow-dense auto-rows-[170px] grid-cols-2 gap-5 sm:auto-rows-[190px] md:grid-cols-4 md:auto-rows-[210px]">
      {categories.map((category, i) => (
        <Reveal key={category.slug} index={i} className={i === 0 ? "col-span-2 row-span-2" : undefined}>
          <CategoryTile category={category} large={i === 0} tint={i % 2 === 1} />
        </Reveal>
      ))}
    </div>
  );
}

function CategoryTile({
  category,
  large,
  tint,
}: {
  category: CategoryShelfEntry;
  large: boolean;
  /** Alternates the non-photo tile's background so a row of typography-only
   *  tiles doesn't read as identical, repeated cards. */
  tint: boolean;
}) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group relative block h-full overflow-hidden rounded-xl border transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-accent/60 hover:shadow-lg"
    >
      {category.imageUrl ? (
        <>
          <Image
            src={category.imageUrl}
            alt=""
            fill
            sizes={large ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"}
            className="object-cover transition-transform duration-500 ease-premium group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 -translate-y-1 text-white/0 transition-all duration-300 ease-premium group-hover:translate-y-0 group-hover:text-white/90" />
          <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
            <p className={cn("font-heading leading-snug text-white", large ? "text-2xl md:text-3xl" : "text-lg")}>
              {category.name}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-white/75">
              {category.bookCount} {category.bookCount === 1 ? "title" : "titles"}
            </p>
          </div>
        </>
      ) : (
        <div
          className={cn(
            "relative flex h-full flex-col justify-end overflow-hidden p-4 transition-colors duration-300 ease-premium md:p-5",
            tint ? "bg-secondary/30 group-hover:bg-secondary/60" : "bg-secondary/55 group-hover:bg-secondary/85",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "absolute -right-2 -top-2 select-none font-heading text-accent/10 transition-colors duration-300 ease-premium group-hover:text-accent/20",
              large ? "text-[7rem] leading-none" : "text-[4.5rem] leading-none",
            )}
          >
            {category.name.charAt(0)}
          </span>
          <span className="absolute left-4 top-4 h-6 w-px bg-accent/70" aria-hidden />
          <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 -translate-y-1 text-foreground/0 transition-all duration-300 ease-premium group-hover:translate-y-0 group-hover:text-accent" />
          <p className={cn("relative font-heading leading-snug text-foreground", large ? "text-2xl md:text-3xl" : "text-lg")}>
            {category.name}
          </p>
          <p className="relative mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {category.bookCount} {category.bookCount === 1 ? "title" : "titles"}
          </p>
        </div>
      )}
    </Link>
  );
}
