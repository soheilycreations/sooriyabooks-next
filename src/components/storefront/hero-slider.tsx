"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { HeroSlide } from "@/lib/content/queries";

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);

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
            <h1 className={`max-w-2xl font-heading text-4xl leading-tight md:text-6xl ${slide.imageUrl ? "text-white" : ""}`}>
              {slide.heading}
            </h1>
            {slide.subheading && (
              <p className={`max-w-lg ${slide.imageUrl ? "text-white/90" : "text-muted-foreground"}`}>{slide.subheading}</p>
            )}
            {slide.buttonText && slide.linkUrl && (
              <Button size="lg" variant="accent" asChild>
                <Link href={slide.linkUrl}>{slide.buttonText}</Link>
              </Button>
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
