import Image from "next/image";
import type { BookCoverTile } from "@/lib/catalog/queries";

/**
 * Full-bleed grid of real book covers behind the hero's "Welcome" text —
 * every tile is a genuine catalog cover (see getRandomBookCovers), not
 * stock art, so the banner is honestly "our books" the way a customer
 * asked for.
 */
export function HeroCoverMosaic({ covers }: { covers: BookCoverTile[] }) {
  return (
    <div className="absolute inset-0 -z-10 grid grid-cols-4 gap-px overflow-hidden bg-foreground sm:grid-cols-6 md:grid-cols-8">
      {covers.map((book) => (
        <div key={book.id} className="relative aspect-[3/4]">
          <Image src={book.coverUrl} alt={book.title} fill sizes="15vw" className="object-cover" />
        </div>
      ))}
    </div>
  );
}
