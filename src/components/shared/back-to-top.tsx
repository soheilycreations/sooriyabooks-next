"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Appears once the page has scrolled a bit — no point offering "back to top"
 * from the top. `floating` renders it as a fixed circular button in the
 * bottom corner (for site-wide placement in the root layout); the default
 * renders the smaller inline ghost style the footer bar already uses.
 */
export function BackToTop({ className, floating = false }: { className?: string; floating?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 480);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-premium",
        floating
          ? "fixed bottom-6 right-6 z-40 h-11 w-11 border-border bg-background text-foreground shadow-lg hover:border-accent hover:text-accent"
          : "h-9 w-9 text-muted-foreground hover:border-accent hover:text-accent",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
        floating && !visible && "translate-y-2",
        className,
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
