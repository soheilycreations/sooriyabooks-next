"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
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
 */
export function SearchFilters({ categories }: { categories: FilterCategory[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get("category") ?? "";
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("limit"); // any filter change resets "load more" progress
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleCategory(slug: string) {
    pushParams((params) => {
      if (activeCategory === slug) params.delete("category");
      else params.set("category", slug);
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

  const hasActiveFilters = activeCategory || searchParams.get("minPrice") || searchParams.get("maxPrice");

  function clearAll() {
    setMinPrice("");
    setMaxPrice("");
    pushParams((params) => {
      params.delete("category");
      params.delete("minPrice");
      params.delete("maxPrice");
    });
  }

  return (
    <aside className="w-full shrink-0 md:w-56">
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
        <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
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
    </aside>
  );
}
