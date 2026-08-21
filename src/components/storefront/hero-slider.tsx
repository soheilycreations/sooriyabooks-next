"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { HeroSlide } from "@/lib/content/queries";

const EASE_PREMIUM = [0.16, 1, 0.3, 1] as const;

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[index];
  if (!slide) return null;

  return (
    <section className="relative overflow-hidden border-b bg-secondary/30">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE_PREMIUM }}
          className="relative"
        >
          {slide.imageUrl && (
            <div className="absolute inset-0 -z-10 overflow-hidden">
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: 1.06 }}
                transition={{ duration: 6, ease: "linear" }}
                className="absolute inset-0"
              >
                <Image src={slide.imageUrl} alt="" fill priority className="object-cover" />
              </motion.div>
              {/* Directional overlay — darkest under the text column, easing off toward the
                  right so the image still reads, rather than a flat tint over everything. */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
          )}
          <div className="container flex min-h-[420px] flex-col items-start justify-center gap-5 py-20 md:min-h-[560px] md:py-28">
            {/* Same static eyebrow the fallback hero uses ("Sooriya Publishers · Since 1994")
                — reused verbatim, not new copy, so both hero states read as one brand voice. */}
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_PREMIUM }}
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-accent"
            >
              <span className="h-px w-8 bg-accent" aria-hidden />
              Sooriya Publishers &middot; Since 1994
            </motion.p>
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_PREMIUM, delay: 0.1 }}
              className={`max-w-3xl text-balance font-heading text-5xl leading-[1.05] tracking-tight md:text-7xl md:leading-[1.03] ${slide.imageUrl ? "text-white" : ""}`}
            >
              {slide.heading}
            </motion.h1>
            {slide.subheading && (
              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE_PREMIUM, delay: 0.2 }}
                className={`max-w-md text-base leading-relaxed md:text-lg ${slide.imageUrl ? "text-white/85" : "text-muted-foreground"}`}
              >
                {slide.subheading}
              </motion.p>
            )}
            {slide.buttonText && slide.linkUrl && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE_PREMIUM, delay: 0.3 }}
                className="mt-2"
              >
                <Button
                  size="lg"
                  variant="accent"
                  asChild
                  className="px-10 shadow-lg shadow-accent/20 transition-transform duration-300 ease-premium hover:scale-[1.02]"
                >
                  <Link href={slide.linkUrl}>{slide.buttonText}</Link>
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/20 px-3 py-2 backdrop-blur-sm">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ease-premium ${i === index ? "w-6 bg-accent" : "w-1.5 bg-white/60 hover:bg-white/80"}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
