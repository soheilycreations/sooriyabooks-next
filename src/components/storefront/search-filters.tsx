"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterCategory {
  slug: string;
  name: string;
}

/**
 * Sidebar filters for /search — category and price range. Same
 * URLSearchParams-push pattern SortSelect already uses, so filters, sort,
 * and the search query all live in the URL together and survive a refresh
 * or a shared link. A real ratings filter isn't included: the catalog
 * currently has zero approved reviews (checked directly against the
 * database), so a "filter by rating" control would have nothing to filter
 * — not worth shipping a control that can never do anything yet.
 *
 * On mobile the full filter panel used to render inline, above the results
 * grid — meaning a shopper had to scroll past the entire category list
 * before seeing a single book. It's now a small edge tab (same slide-in
 * drawer pattern as AccountDrawer) so the results are visible immediately,
 * with filters one tap away.
 */
export function SearchFilters({ categories }: { categories: FilterCategory[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get("category") ?? "";
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("limit"); // any filter change resets "load more" progress
    router.push(`${pathname}?${params.toString()}`);
    setMobileOpen(false);
  }

  function toggleCategory(slug: string) {
    pushParams((params) => {
      if (activeCategory === slug) {
        params.delete("category");
        return;
      }
      params.set("category", slug);
      // "New Arrivals" / "Featured" are their own special views of the
      // whole catalog, not filters meant to stack with a category — left
      // in place, picking a category silently AND-ed with whichever view
      // the customer arrived from (e.g. from a "New Arrivals" link) and
      // could show 0 results for a category that's actually full of
      // books, which reads as broken rather than "no matches."
      params.delete("new");
      params.delete("featured");
    });
  }

  function applyPriceRange(e: React.FormEvent) {
    e.preventDefault();
    pushParams((params) => {
      if (minPrice) params.set("minPrice", minPrice);
      else params.delete("minPrice");
      if (maxPrice) params.set("maxPrice", maxPrice);
      else params.delete("maxPrice");
    });
  }

  const activeFilterCount = [activeCategory, searchParams.get("minPrice"), searchParams.get("maxPrice")].filter(
    Boolean,
  ).length;
  const hasActiveFilters = activeFilterCount > 0;

  function clearAll() {
    setMinPrice("");
    setMaxPrice("");
    pushParams((params) => {
      params.delete("category");
      params.delete("minPrice");
      params.delete("maxPrice");
    });
  }

  const filterContent = (
    <>
      <div className="flex items-center justify-between">
        <p className="font-heading text-lg">Filters</p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-accent"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      <div className="mt-5 border-t pt-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</p>
        {/* No scroll/max-height of its own — the desktop <aside> is already
            the one scrollable container; nesting a second scrollable box
            here just produced two visible scrollbars stacked next to
            each other. */}
        <ul className="space-y-1">
          {categories.map((cat) => (
            <li key={cat.slug}>
              <button
                type="button"
                onClick={() => toggleCategory(cat.slug)}
                className={cn(
                  "block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary",
                  activeCategory === cat.slug ? "bg-accent/10 font-medium text-accent" : "text-foreground/80",
                )}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 border-t pt-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Price Range (LKR)</p>
        <form onSubmit={applyPriceRange} className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Apply
          </Button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: sticky sidebar, always visible — offset below the sticky
          site header so it follows the scroll alongside the results grid. */}
      <aside className="hidden w-56 shrink-0 md:sticky md:top-24 md:block md:max-h-[calc(100vh-7rem)] md:overflow-y-auto">
        {filterContent}
      </aside>

      {/* Mobile: a small tab pinned to the screen edge that expands into a
          slide-in drawer, instead of the filter list sitting inline above
          the results and pushing every book below the fold. */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open filters"
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-1.5 rounded-l-full border border-r-0 bg-card py-3 pl-3 pr-2 text-sm font-medium text-foreground shadow-md md:hidden"
      >
        <SlidersHorizontal className="h-4 w-4 text-accent" aria-hidden />
        {hasActiveFilters && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
            {activeFilterCount}
          </span>
        )}
      </button>

      {mounted &&
        createPortal(
          <>
            <div
              className={cn(
                "fixed inset-0 z-[100] bg-black/40 transition-opacity duration-300 ease-premium md:hidden",
                mobileOpen ? "visible opacity-100" : "invisible opacity-0",
              )}
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              inert={!mobileOpen || undefined}
              className={cn(
                "fixed inset-y-0 right-0 z-[101] flex h-full w-full max-w-xs flex-col overflow-y-auto border-l bg-background p-6 shadow-2xl transition-transform duration-300 ease-premium md:hidden",
                mobileOpen ? "translate-x-0" : "translate-x-full",
              )}
            >
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close filters"
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-secondary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {filterContent}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
