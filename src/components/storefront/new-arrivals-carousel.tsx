"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";
import { Reveal } from "@/components/storefront/reveal";
import type { BookCardData } from "@/lib/catalog/queries";

const CARD_SCROLL_DISTANCE = 248;
const AUTOPLAY_INTERVAL_MS = 4000;

/**
 * Same scroll-snap carousel the homepage already used for New Arrivals —
 * this adds desktop prev/next controls (native touch scrolling still works
 * on mobile) plus a looping autoplay: it advances one card at a time and
 * jumps back to the start once it runs out of room, so it reads as a
 * continuous loop rather than stopping dead at the last book. Paused while
 * the pointer or keyboard focus is anywhere inside the carousel — manual
 * browsing always wins over autoplay — and skipped entirely for
 * prefers-reduced-motion. No data/props beyond what the section already
 * passed in.
 */
export function NewArrivalsCarousel({
  books,
  wishlistIds,
}: {
  books: BookCardData[];
  wishlistIds: Set<string>;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  function scrollByCard(direction: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: direction * CARD_SCROLL_DISTANCE, behavior: "smooth" });
  }

  useEffect(() => {
    if (reduceMotion || paused || books.length <= 1) return;
    const id = setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + CARD_SCROLL_DISTANCE, behavior: "smooth" });
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [reduceMotion, paused, books.length]);

  return (
    <div
      className="group/carousel relative"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {books.map((book, i) => (
          <Reveal key={book.id} index={i} className="w-[46vw] shrink-0 snap-start sm:w-[230px]">
            <ProductCard book={book} showWishlist inWishlist={wishlistIds.has(book.id)} showQuickAdd />
          </Reveal>
        ))}
      </div>

      <button
        type="button"
        aria-label="Scroll to previous books"
        onClick={() => scrollByCard(-1)}
        className="absolute left-0 top-[38%] hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-foreground/70 opacity-0 shadow-md transition-all duration-300 ease-premium hover:border-accent hover:text-accent group-hover/carousel:opacity-100 md:flex"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Scroll to next books"
        onClick={() => scrollByCard(1)}
        className="absolute right-0 top-[38%] hidden h-10 w-10 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border bg-background text-foreground/70 opacity-0 shadow-md transition-all duration-300 ease-premium hover:border-accent hover:text-accent group-hover/carousel:opacity-100 md:flex"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
