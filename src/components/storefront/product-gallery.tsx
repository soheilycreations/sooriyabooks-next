"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  url: string;
  alt: string;
}

/**
 * Product image gallery. With a single image (the common case today, and
 * every product that only ever had one photo) this renders exactly as the
 * old single-image block did — no thumbnail strip, no extra chrome, so
 * single-image products are visually unchanged. A thumbnail strip only
 * appears once there's something to switch between.
 */
export function ProductGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  return (
    <div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
        {active ? (
          <Image src={active.url} alt={active.alt || title} fill sizes="50vw" className="object-cover" priority />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No cover available
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                i === activeIndex ? "border-accent" : "border-transparent hover:border-input",
              )}
              aria-label={`View image ${i + 1} of ${title}`}
              aria-current={i === activeIndex}
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
