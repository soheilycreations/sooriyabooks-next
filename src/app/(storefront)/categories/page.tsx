import type { Metadata } from "next";
import Link from "next/link";
import { getAllCategories } from "@/lib/catalog/queries";
import { decodeHtmlEntities, cn } from "@/lib/utils";
import { Reveal } from "@/components/storefront/reveal";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "All Categories",
  description: "Browse every book category at Sooriya Publishers.",
};

export default async function CategoriesPage() {
  const categories = await getAllCategories();

  // The Shop menu's own dropdown is scoped to just the Sooriya Books
  // imprint (see header.tsx) — this page is the deliberate "everything"
  // complement to that, so nothing here is trimmed for tidiness.
  // "Uncategorized" is the one WooCommerce-import catch-all that's never a
  // real browsing target.
  const real = categories.filter((c) => c.slug !== "uncategorized");
  const topLevel = real.filter((c) => c.parent_id === null);
  const childrenByParentId = new Map<string, typeof real>();
  for (const c of real) {
    if (c.parent_id === null) continue;
    if (!childrenByParentId.has(c.parent_id)) childrenByParentId.set(c.parent_id, []);
    childrenByParentId.get(c.parent_id)!.push(c);
  }

  // Sooriya Books — the publisher's own imprint, and by far the biggest
  // entry — gets a featured, full-width card up top; the rest follow in a
  // regular grid.
  const featuredIndex = topLevel.findIndex((c) => c.slug === "sooriya-books");
  const featured = featuredIndex >= 0 ? topLevel[featuredIndex] : null;
  const rest = featured ? topLevel.filter((c) => c.id !== featured.id) : topLevel;

  return (
    <div>
      <div className="container py-16 text-center md:py-24">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-accent">Full Catalog</p>
          <h1 className="mx-auto mt-3 max-w-2xl font-heading text-4xl leading-tight md:text-6xl md:leading-tight">
            All Categories
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Every category we carry, {topLevel.length} in total — from the Sooriya Books imprint to every other
            publisher on our shelves.
          </p>
        </Reveal>
      </div>

      <div className="container max-w-5xl pb-20 md:pb-28">
        {featured && (
          <Reveal>
            <CategoryCard category={featured} subcategories={childrenByParentId.get(featured.id) ?? []} featured />
          </Reveal>
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {rest.map((cat, i) => (
            <Reveal key={cat.id} index={i % 8}>
              <CategoryCard category={cat} subcategories={childrenByParentId.get(cat.id) ?? []} />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  subcategories,
  featured = false,
}: {
  category: { id: string; name: string; slug: string };
  subcategories: { id: string; name: string; slug: string }[];
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 transition-shadow duration-300 ease-premium hover:shadow-md",
        featured && "border-accent/30 bg-accent/5",
      )}
    >
      <Link
        href={`/category/${category.slug}`}
        className={cn(
          "inline-flex items-center gap-2 font-heading text-foreground transition-colors hover:text-accent",
          featured ? "text-2xl" : "text-lg",
        )}
      >
        {decodeHtmlEntities(category.name)}
      </Link>
      {subcategories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {subcategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/category/${sub.slug}`}
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-accent"
            >
              {decodeHtmlEntities(sub.name)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
