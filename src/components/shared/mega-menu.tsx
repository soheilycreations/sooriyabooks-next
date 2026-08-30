"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { NavCategory } from "@/lib/catalog/nav-categories";
import { cn, navLinkFocusClass } from "@/lib/utils";

const navTriggerClass = cn(
  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground",
  navLinkFocusClass,
);

const CLOSE_DELAY_MS = 150;

/**
 * Keyword-based fiction/non-fiction split over the REAL category names —
 * not a fabricated taxonomy, just organizing the existing names the same
 * way a bookseller would group a shelf. Anything that doesn't match either
 * list lands in "More" rather than being guessed at.
 */
const FICTION_HINTS = [
  "novel", "fiction", "story", "stories", "poem", "poetry", "children",
  "young adult", "folklore", "folktale", "adventure", "horror", "art stories",
];
const NONFICTION_HINTS = [
  "academic", "research", "education", "religion", "history", "medical",
  "law", "logic", "psychology", "psychological", "sociology", "politic",
  "science", "astronomy", "management", "general knowledge", "buddhism",
  "travel", "biography", "autobiography", "dictionary", "dictionaries",
  "aesthetics", "culinary", "motor", "mechanical",
];

// Above this many items a single column reads as one long unbroken list —
// split it into two side-by-side halves instead (currently only "Sooriya
// Books" is long enough to trigger this).
const WIDE_COLUMN_THRESHOLD = 8;

function splitInHalf<T>(items: T[]): [T[], T[]] {
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)];
}

function classify(name: string): "fiction" | "nonfiction" | "more" {
  const lower = name.toLowerCase();
  if (FICTION_HINTS.some((k) => lower.includes(k))) return "fiction";
  if (NONFICTION_HINTS.some((k) => lower.includes(k))) return "nonfiction";
  return "more";
}

function groupCategories(categories: NavCategory[]) {
  const fiction: NavCategory[] = [];
  const nonfiction: NavCategory[] = [];
  const more: NavCategory[] = [];
  // "Sooriya Books" — the publisher's own imprint, and by far the biggest
  // category (it has more sub-categories than everything else combined) —
  // gets pulled out into its own dedicated column below rather than being
  // lumped into the generic "More" bucket with everything else.
  let sooriyaBooks: NavCategory | null = null;
  for (const cat of categories) {
    if (cat.slug === "sooriya-books") {
      sooriyaBooks = cat;
      continue;
    }
    const bucket = classify(cat.name);
    (bucket === "fiction" ? fiction : bucket === "nonfiction" ? nonfiction : more).push(cat);
  }
  return { sooriyaBooks, fiction, nonfiction, more };
}

export function MegaMenu({
  categories,
  open,
  onOpenChange,
}: {
  categories: NavCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onOpenChange(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onOpenChange]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  function openNow() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    onOpenChange(true);
  }

  // A short delay before actually closing means moving the cursor diagonally
  // from the trigger into the panel (which briefly leaves both) doesn't
  // slam the menu shut mid-move.
  function closeSoon() {
    closeTimer.current = setTimeout(() => onOpenChange(false), CLOSE_DELAY_MS);
  }

  function CategoryList({ items }: { items: NavCategory[] }) {
    return (
      <ul className="space-y-3">
        {items.map((cat) => (
          <li key={cat.slug}>
            <Link
              href={`/category/${cat.slug}`}
              tabIndex={open ? 0 : -1}
              role="menuitem"
              className="group inline-flex items-center text-sm text-foreground/80 transition-colors hover:text-accent"
            >
              <span className="max-w-0 overflow-hidden opacity-0 transition-all duration-200 ease-premium group-hover:mr-1.5 group-hover:max-w-[0.6em] group-hover:opacity-100">
                →
              </span>
              {cat.name}
            </Link>
            {cat.children && cat.children.length > 0 && (
              <ul className="mt-1.5 space-y-1.5 border-l pl-3">
                {cat.children.map((sub) => (
                  <li key={sub.slug}>
                    <Link
                      href={`/category/${sub.slug}`}
                      tabIndex={open ? 0 : -1}
                      role="menuitem"
                      className="text-xs text-muted-foreground transition-colors hover:text-accent"
                    >
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    );
  }

  const { sooriyaBooks, fiction, nonfiction, more } = groupCategories(categories);

  // Sooriya Books' own column comes first (priority), ahead of Fiction/
  // Non-Fiction. "More" is deliberately NOT one of these grid columns — its
  // item count varies and doesn't reliably divide evenly into the 6-track
  // grid alongside the other (sometimes-wide) columns, which left it
  // stranded alone on its own row. It gets its own full-width strip below
  // instead (see `more` usage further down).
  const columns = [
    sooriyaBooks && { label: sooriyaBooks.name, href: `/category/${sooriyaBooks.slug}`, items: sooriyaBooks.children ?? [] },
    { label: "Fiction", href: null, items: fiction },
    { label: "Non-Fiction", href: null, items: nonfiction },
  ].filter((c): c is { label: string; href: string | null; items: NavCategory[] } => !!c && c.items.length > 0);

  return (
    <div ref={containerRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        type="button"
        className={navTriggerClass}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => onOpenChange(!open)}
      >
        Shop
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200 ease-premium", open && "rotate-180")} />
      </button>

      {/* Always rendered, visibility toggled by class — no mount/unmount animation
          lifecycle to get stuck mid-transition. */}
      <div
        className={cn(
          "absolute left-1/2 top-full z-50 mt-3 w-[min(94vw,980px)] -translate-x-1/2 origin-top overflow-hidden rounded-lg border bg-card shadow-xl transition-[opacity,transform] duration-200 ease-premium",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1.5 scale-[0.99] opacity-0",
        )}
        role="menu"
        aria-hidden={!open}
      >
        <div className="h-0.5 w-full rounded-t-lg bg-gradient-to-r from-accent/60 via-accent to-accent/60" aria-hidden />
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 bg-secondary/20 p-8 sm:grid-cols-6">
          <div>
            <p className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
              <span className="h-px w-4 bg-accent" aria-hidden />
              Shop
            </p>
            <ul className="space-y-3">
              {[
                { href: "/search", label: "All Books" },
                { href: "/search?new=1", label: "New Arrivals" },
                { href: "/search?featured=1", label: "Featured Books" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    tabIndex={open ? 0 : -1}
                    role="menuitem"
                    className="group inline-flex items-center text-sm text-foreground/80 transition-colors hover:text-accent"
                  >
                    <span className="max-w-0 overflow-hidden opacity-0 transition-all duration-200 ease-premium group-hover:mr-1.5 group-hover:max-w-[0.6em] group-hover:opacity-100">
                      →
                    </span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {columns.map((column) => {
            const isWide = column.items.length > WIDE_COLUMN_THRESHOLD;
            const [firstHalf, secondHalf] = isWide ? splitInHalf(column.items) : [column.items, []];
            return (
              <div key={column.label} className={isWide ? "sm:col-span-2" : undefined}>
                {column.href ? (
                  <Link
                    href={column.href}
                    tabIndex={open ? 0 : -1}
                    role="menuitem"
                    className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent hover:underline"
                  >
                    <span className="h-px w-4 bg-accent" aria-hidden />
                    {column.label}
                  </Link>
                ) : (
                  <p className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
                    <span className="h-px w-4 bg-accent" aria-hidden />
                    {column.label}
                  </p>
                )}
                {isWide ? (
                  <div className="grid grid-cols-2 gap-x-6">
                    <CategoryList items={firstHalf} />
                    <CategoryList items={secondHalf} />
                  </div>
                ) : (
                  <CategoryList items={column.items} />
                )}
              </div>
            );
          })}
        </div>

        {more.length > 0 && (
          <div className="border-t bg-secondary/20 px-8 py-5">
            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
              <span className="h-px w-4 bg-accent" aria-hidden />
              More
            </p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {more.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/category/${cat.slug}`}
                    tabIndex={open ? 0 : -1}
                    role="menuitem"
                    className="text-sm text-foreground/80 transition-colors hover:text-accent"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
