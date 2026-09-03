"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { BookCoverTile } from "@/lib/catalog/queries";

const VISIBLE_COUNT = 24;
const STEP_INTERVAL_MS = 900;

/**
 * Full-bleed grid of real book covers behind the hero's "Welcome" text —
 * every tile is a genuine catalog cover (see getRandomBookCovers), not
 * stock art, so the banner is honestly "our books" the way a customer
 * asked for. `covers` is fetched much larger than VISIBLE_COUNT on
 * purpose: the extra tiles are the rotation pool. Tiles swap to a fresh
 * cover one at a time, in grid order, so it reads as a wave rippling
 * across the wall (left to right, row by row) rather than random flicker.
 * Skipped for prefers-reduced-motion.
 */
export function HeroCoverMosaic({ covers }: { covers: BookCoverTile[] }) {
  const [visible, setVisible] = useState<BookCoverTile[]>(() => covers.slice(0, VISIBLE_COUNT));
  const stepRef = useRef(0);
  const poolPositionRef = useRef(VISIBLE_COUNT);

  useEffect(() => {
    if (covers.length <= VISIBLE_COUNT) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setVisible((current) => {
        const slot = stepRef.current % current.length;
        stepRef.current += 1;

        // Walk the pool in order (wrapping) instead of picking randomly —
        // paired with the sequential slot, this is what makes the same
        // wave loop feel identical on every pass instead of reshuffling.
        const next = covers[poolPositionRef.current % covers.length];
        poolPositionRef.current += 1;
        if (!next || next.id === current[slot]?.id) return current;

        const updated = [...current];
        updated[slot] = next;
        return updated;
      });
    }, STEP_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [covers]);

  return (
    <div className="absolute inset-0 -z-10 grid grid-cols-4 gap-px overflow-hidden bg-foreground sm:grid-cols-6 md:grid-cols-8">
      {/* Keyed by grid position (not book id) — each tile is a persistent
          FlipTile that flips itself in place when its target book changes,
          instead of remounting. */}
      {visible.map((book, i) => (
        <FlipTile key={i} book={book} />
      ))}
    </div>
  );
}

/**
 * A single mosaic cell that page-flips (3D rotateY) from its current cover
 * to a new one whenever `book` changes, like a book cover turning over —
 * rather than a plain crossfade. Holds two faces glued back-to-back inside
 * a rotating card; the container's rotation angle only ever increases (by
 * 180° per flip), so every flip animates forward with no snap-back, and
 * whichever face is momentarily hidden gets loaded with the next cover
 * before the flip reveals it.
 */
function FlipTile({ book }: { book: BookCoverTile }) {
  const [angle, setAngle] = useState(0);
  const [faces, setFaces] = useState<[BookCoverTile, BookCoverTile]>([book, book]);
  const visibleIndex = (angle / 180) % 2;

  useEffect(() => {
    const currentBook = faces[visibleIndex]!;
    if (book.id === currentBook.id) return;
    const hiddenIndex = visibleIndex === 0 ? 1 : 0;
    setFaces((prev) => {
      const updated: [BookCoverTile, BookCoverTile] = [...prev];
      updated[hiddenIndex] = book;
      return updated;
    });
    setAngle((a) => a + 180);
    // Only the incoming book should trigger a flip — re-checking against
    // `faces`/`visibleIndex` here would fire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book]);

  return (
    <div className="relative aspect-[3/4] [perspective:1000px]">
      <div
        className="relative h-full w-full transition-transform duration-700 ease-in-out [transform-style:preserve-3d]"
        style={{ transform: `rotateY(${angle}deg)` }}
      >
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <Image
            src={faces[0].coverUrl}
            alt={faces[0].title}
            fill
            sizes="15vw"
            className="object-cover saturate-[1.15]"
          />
        </div>
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <Image
            src={faces[1].coverUrl}
            alt={faces[1].title}
            fill
            sizes="15vw"
            className="object-cover saturate-[1.15]"
          />
        </div>
      </div>
    </div>
  );
}
