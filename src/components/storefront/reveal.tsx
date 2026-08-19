"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const EASE_PREMIUM = [0.16, 1, 0.3, 1] as const;

/**
 * Scroll-triggered fade-up reveal, used for section intros and grid items.
 * `index` staggers grid entrances (0, 1, 2...) without a separate variants
 * dance — each item just gets a slightly later delay. Reduced-motion users
 * get an instant, un-animated render (framer-motion's `useReducedMotion`,
 * same signal as the global CSS media query, kept in sync deliberately).
 */
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: EASE_PREMIUM, delay: Math.min(index, 6) * 0.06 }}
    >
      {children}
    </motion.div>
  );
}
