import Image from "next/image";
import Link from "next/link";
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
    <div className="grid grid-flow-dense auto-rows-[160px] grid-cols-2 gap-4 sm:auto-rows-[180px] md:grid-cols-4 md:auto-rows-[200px]">
      {categories.map((category, i) => (
        <Reveal key={category.slug} index={i} className={i === 0 ? "col-span-2 row-span-2" : undefined}>
          <CategoryTile category={category} large={i === 0} />
        </Reveal>
      ))}
    </div>
  );
}

function CategoryTile({ category, large }: { category: CategoryShelfEntry; large: boolean }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group relative block h-full overflow-hidden rounded-lg border"
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className={cn("font-heading text-white", large ? "text-2xl" : "text-lg")}>{category.name}</p>
            <p className="mt-1 text-xs text-white/80">
              {category.bookCount} {category.bookCount === 1 ? "book" : "books"}
            </p>
          </div>
        </>
      ) : (
        <div className="flex h-full flex-col justify-end bg-secondary/60 p-4 transition-colors group-hover:bg-secondary">
          <p className={cn("font-heading leading-snug text-foreground", large ? "text-2xl" : "text-lg")}>
            {category.name}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {category.bookCount} {category.bookCount === 1 ? "book" : "books"}
          </p>
        </div>
      )}
    </Link>
  );
}
