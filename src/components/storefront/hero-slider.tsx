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
          transition={{ duration: 0.5 }}
          className="relative"
        >
          {slide.imageUrl && (
            <div className="absolute inset-0 -z-10">
              <Image src={slide.imageUrl} alt="" fill priority className="object-cover" />
              <div className="absolute inset-0 bg-black/30" />
            </div>
          )}
          <div className="container flex flex-col items-start gap-6 py-20 md:py-28">
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_PREMIUM }}
              className={`max-w-2xl font-heading text-4xl leading-tight md:text-6xl md:leading-tight ${slide.imageUrl ? "text-white" : ""}`}
            >
              {slide.heading}
            </motion.h1>
            {slide.subheading && (
              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE_PREMIUM, delay: 0.1 }}
                className={`max-w-lg ${slide.imageUrl ? "text-white/90" : "text-muted-foreground"}`}
              >
                {slide.subheading}
              </motion.p>
            )}
            {slide.buttonText && slide.linkUrl && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE_PREMIUM, delay: 0.2 }}
              >
                <Button size="lg" variant="accent" asChild>
                  <Link href={slide.linkUrl}>{slide.buttonText}</Link>
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-accent" : "w-1.5 bg-white/60"}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
