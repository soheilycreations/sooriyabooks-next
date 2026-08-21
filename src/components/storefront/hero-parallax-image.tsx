"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/**
 * Full-bleed hero background photo with a very subtle scroll parallax — the
 * image drifts a little slower than the page as it scrolls through view,
 * using the existing framer-motion dependency (already used by Reveal
 * elsewhere) rather than a new animation library. Purely decorative: real
 * hero copy lives in the server-rendered section around this component, not
 * inside it, so none of it depends on JS to be readable.
 */
export function HeroParallaxImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  // A small, deliberately restrained range — this reads as gentle depth, not
  // a dramatic parallax effect. Disabled outright for reduced-motion users.
  const y = useTransform(scrollYProgress, [0, 1], reduceMotion ? ["0%", "0%"] : ["-6%", "6%"]);
  const scale = reduceMotion ? 1 : 1.12;

  return (
    <div ref={ref} className="absolute inset-0 -z-10 overflow-hidden">
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <Image src={src} alt={alt} fill priority sizes="100vw" className="object-cover" />
      </motion.div>
    </div>
  );
}
