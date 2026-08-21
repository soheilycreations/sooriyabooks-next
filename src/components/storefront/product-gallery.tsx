"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
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
 *
 * The mouse-follow tilt is desktop-only by construction: it's driven by
 * onMouseMove, which touch devices never fire, and is additionally capped
 * to a few degrees so it reads as depth rather than a gimmick. Reduced
 * motion is handled two ways — useReducedMotion() zeroes the spring's
 * target before it ever moves, and the global CSS reduced-motion rule
 * (globals.css) collapses the transition duration to ~0 as a hard backstop.
 */
export function ProductGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];
  const reduceMotion = useReducedMotion();

  const frameRef = useRef<HTMLDivElement>(null);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const springX = useSpring(tiltX, { stiffness: 200, damping: 22 });
  const springY = useSpring(tiltY, { stiffness: 200, damping: 22 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [reduceMotion ? 0 : 5, reduceMotion ? 0 : -5]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [reduceMotion ? 0 : -5, reduceMotion ? 0 : 5]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    tiltX.set((e.clientX - rect.left) / rect.width - 0.5);
    tiltY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    tiltX.set(0);
    tiltY.set(0);
  }

  return (
    <div className="motion-safe:animate-fade-in">
      <div style={{ perspective: 1600 }}>
        <motion.div
          ref={frameRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="relative aspect-[3/4] overflow-hidden rounded-xl border bg-muted shadow-[0_30px_60px_-15px_rgba(0,0,0,0.25)]"
        >
          {active ? (
            <Image
              src={active.url}
              alt={active.alt || title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No cover available
            </div>
          )}
          {/* A faint top sheen, not a gradient wash — reinforces the glass/print
              feel of a book cover without tinting the artwork itself. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
        </motion.div>
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2.5">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-md border transition-all duration-300 ease-premium",
                i === activeIndex
                  ? "border-accent ring-1 ring-accent"
                  : "border-border/60 opacity-70 hover:opacity-100 hover:border-foreground/30",
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
