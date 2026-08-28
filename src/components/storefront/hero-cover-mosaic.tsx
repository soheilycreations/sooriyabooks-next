"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { BookCoverTile } from "@/lib/catalog/queries";

const VISIBLE_COUNT = 24;
const ROTATE_INTERVAL_MS = 1200;
const SWAPS_PER_TICK = 2;

/**
 * Full-bleed grid of real book covers behind the hero's "Welcome" text —
 * every tile is a genuine catalog cover (see getRandomBookCovers), not
 * stock art, so the banner is honestly "our books" the way a customer
 * asked for. `covers` is fetched much larger than VISIBLE_COUNT on
 * purpose: the extra tiles are the rotation pool, so a couple of tiles
 * keep quietly swapping to fresh covers on a steady beat — a visibly
 * "alive" wall — without ever refetching. Skipped for prefers-reduced-motion.
 */
export function HeroCoverMosaic({ covers }: { covers: BookCoverTile[] }) {
  const [visible, setVisible] = useState<BookCoverTile[]>(() => covers.slice(0, VISIBLE_COUNT));

  useEffect(() => {
    if (covers.length <= VISIBLE_COUNT) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setVisible((current) => {
        const updated = [...current];
        for (let n = 0; n < SWAPS_PER_TICK; n++) {
          const shownIds = new Set(updated.map((c) => c.id));
          const pool = covers.filter((c) => !shownIds.has(c.id));
          const next = pool[Math.floor(Math.random() * pool.length)];
          if (!next) continue;
          const slot = Math.floor(Math.random() * updated.length);
          updated[slot] = next;
        }
        return updated;
      });
    }, ROTATE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [covers]);

  return (
    <div className="absolute inset-0 -z-10 grid grid-cols-4 gap-px overflow-hidden bg-foreground sm:grid-cols-6 md:grid-cols-8">
      {visible.map((book, i) => (
        // Keying on id+slot forces a remount when a tile rotates in, which
        // replays the fade-in animation for just that one tile.
        <div key={`${i}-${book.id}`} className="relative aspect-[3/4] motion-safe:animate-fade-in">
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
