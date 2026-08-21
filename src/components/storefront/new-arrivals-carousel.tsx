"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";
import { Reveal } from "@/components/storefront/reveal";
import type { BookCardData } from "@/lib/catalog/queries";

/**
 * Same scroll-snap carousel the homepage already used for New Arrivals —
 * this only adds desktop prev/next controls around it (native touch
 * scrolling still works on mobile). No data/props beyond what the section
 * already passed in.
 */
export function NewArrivalsCarousel({
  books,
  wishlistIds,
}: {
  books: BookCardData[];
  wishlistIds: Set<string>;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: direction * 248, behavior: "smooth" });
  }

  return (
    <div className="group/carousel relative">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {books.map((book, i) => (
          <Reveal key={book.id} index={i} className="w-[46vw] shrink-0 snap-start sm:w-[230px]">
            <ProductCard book={book} showWishlist inWishlist={wishlistIds.has(book.id)} />
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
