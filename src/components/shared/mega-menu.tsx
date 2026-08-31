"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutGrid } from "lucide-react";
import type { NavCategory } from "@/lib/catalog/nav-categories";
import { cn, navLinkFocusClass } from "@/lib/utils";

const navTriggerClass = cn(
  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground",
  navLinkFocusClass,
);

const CLOSE_DELAY_MS = 150;

const tileClass = cn(
  "group flex items-center rounded-md border border-transparent px-3 py-2.5 text-sm text-foreground/80 transition-colors hover:border-border hover:bg-background hover:text-accent",
  navLinkFocusClass,
);

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
          lifecycle to get stuck mid-transition. `fixed` + viewport-centered
          rather than positioned under the trigger: "Shop" sits well right
          of center in this header, so anchoring to it pushed a wide panel
          partly off-screen. Still a DOM descendant of the hover wrapper
          above, so open/close-on-hover is unaffected. */}
      <div
        className={cn(
          "fixed left-1/2 top-20 z-50 w-[min(94vw,820px)] -translate-x-1/2 origin-top overflow-hidden rounded-lg border bg-card shadow-xl transition-[opacity,transform] duration-200 ease-premium",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1.5 scale-[0.99] opacity-0",
        )}
        role="menu"
        aria-hidden={!open}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-accent/60 via-accent to-accent/60" aria-hidden />
        <div className="p-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { href: "/search", label: "All Books" },
              { href: "/search?new=1", label: "New Arrivals" },
              { href: "/search?featured=1", label: "Featured Books" },
            ].map((link) => (
              <Link key={link.href} href={link.href} tabIndex={open ? 0 : -1} role="menuitem" className={tileClass}>
                {link.label}
              </Link>
            ))}
          </div>

          {categories.length > 0 && (
            <>
              <p className="mb-2 mt-5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
                <span className="h-px w-4 bg-accent" aria-hidden />
                Sooriya Books
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {categories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    tabIndex={open ? 0 : -1}
                    role="menuitem"
                    className={tileClass}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </>
          )}

          <Link
            href="/categories"
            tabIndex={open ? 0 : -1}
            role="menuitem"
            className="mt-4 flex items-center justify-center gap-2 rounded-md border border-dashed py-3 text-sm font-medium text-accent transition-colors hover:border-accent hover:bg-accent/5"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
            Browse All Categories
          </Link>
        </div>
      </div>
    </div>
  );
}
