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
      {visible.map((book, i) => (
        // Keying on id+slot forces a remount when a tile rotates in, which
        // replays the (slow, deliberate) crossfade for just that one tile.
        <div key={`${i}-${book.id}`} className="relative aspect-[3/4] motion-safe:animate-cover-fade">
          <Image
            src={book.coverUrl}
            alt={book.title}
            fill
            sizes="15vw"
            className="object-cover saturate-[1.15]"
          />
        </div>
      ))}
    </div>
  );
}
