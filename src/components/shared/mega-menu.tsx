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
  for (const cat of categories) {
    const bucket = classify(cat.name);
    (bucket === "fiction" ? fiction : bucket === "nonfiction" ? nonfiction : more).push(cat);
  }
  return { fiction, nonfiction, more };
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

  const { fiction, nonfiction, more } = groupCategories(categories);

  const columns = [
    { label: "Fiction", items: fiction },
    { label: "Non-Fiction", items: nonfiction },
    { label: "More", items: more },
  ].filter((c) => c.items.length > 0);

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
          "absolute left-1/2 top-full z-50 mt-3 w-[min(92vw,860px)] -translate-x-1/2 origin-top rounded-lg border bg-card shadow-xl transition-[opacity,transform] duration-200 ease-premium",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1.5 scale-[0.99] opacity-0",
        )}
        role="menu"
        aria-hidden={!open}
      >
        <div className="h-0.5 w-full rounded-t-lg bg-gradient-to-r from-accent/60 via-accent to-accent/60" aria-hidden />
        <div className="grid grid-cols-2 gap-x-10 gap-y-8 bg-secondary/20 p-8 sm:grid-cols-4">
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

          {columns.map((column) => (
            <div key={column.label}>
              <p className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
                <span className="h-px w-4 bg-accent" aria-hidden />
                {column.label}
              </p>
              <ul className="space-y-3">
                {column.items.map((cat) => (
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
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
