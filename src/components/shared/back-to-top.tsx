"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Appears once the page has scrolled a bit — no point offering "back to top" from the top. */
export function BackToTop({ className }: { className?: string }) {
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
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition-all duration-300 ease-premium hover:border-accent hover:text-accent",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
        className,
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
