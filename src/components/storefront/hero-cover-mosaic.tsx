"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { BookCoverTile } from "@/lib/catalog/queries";

const VISIBLE_COUNT = 24;
const ROTATE_INTERVAL_MS = 3500;

/**
 * Full-bleed grid of real book covers behind the hero's "Welcome" text —
 * every tile is a genuine catalog cover (see getRandomBookCovers), not
 * stock art, so the banner is honestly "our books" the way a customer
 * asked for. `covers` is fetched larger than VISIBLE_COUNT on purpose: the
 * extra tiles are the rotation pool, so one tile quietly swaps to a fresh
 * cover every few seconds — a small "live" feel — without ever refetching.
 * Skipped entirely for prefers-reduced-motion.
 */
export function HeroCoverMosaic({ covers }: { covers: BookCoverTile[] }) {
  const [visible, setVisible] = useState<BookCoverTile[]>(() => covers.slice(0, VISIBLE_COUNT));

  useEffect(() => {
    if (covers.length <= VISIBLE_COUNT) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setVisible((current) => {
        const shownIds = new Set(current.map((c) => c.id));
        const pool = covers.filter((c) => !shownIds.has(c.id));
        if (pool.length === 0) return current;
        const next = pool[Math.floor(Math.random() * pool.length)];
        if (!next) return current;
        const slot = Math.floor(Math.random() * current.length);
        const updated = [...current];
        updated[slot] = next;
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
