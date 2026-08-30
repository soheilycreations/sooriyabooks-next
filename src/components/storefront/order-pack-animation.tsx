"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

export interface OrderPackCover {
  url: string;
  title: string;
}

type Phase = "packing" | "closing" | "labeling" | "done";

// Where each cover starts, scattered around the box, before it "drops" in.
// Fixed rather than randomized so there's no hydration/re-render jitter —
// cycles through if an order has more items than positions.
const SCATTER_POSITIONS = [
  { x: -90, y: -70, rotate: -18 },
  { x: 85, y: -85, rotate: 14 },
  { x: -100, y: 30, rotate: 10 },
  { x: 95, y: 40, rotate: -12 },
  { x: 0, y: -100, rotate: 4 },
];

const PHASE_DURATIONS_MS: Record<Exclude<Phase, "done">, number> = {
  packing: 1300,
  closing: 500,
  labeling: 900,
};

/**
 * Plays once on the order-confirmation page (guest or logged-in) right
 * after checkout: the order's own cover images "drop" into a box, the
 * flaps close, and a shipping label with the order number slides on. Ends
 * by leaving that same closed, labeled box sitting inline on the page —
 * the animation is a one-time flourish over what's already a permanent
 * fixture, not a separate popup that vanishes without a trace.
 */
export function OrderPackAnimation({
  orderNumber,
  covers,
  celebrate = true,
}: {
  orderNumber: string;
  covers: OrderPackCover[];
  /** False on a return visit (e.g. re-checking tracking later) — shows only
   *  the permanent packed box, skipping the unboxing overlay so it doesn't
   *  replay the "just placed" moment every time. */
  celebrate?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const playOverlay = celebrate && !reduceMotion;
  const [phase, setPhase] = useState<Phase>(playOverlay ? "packing" : "done");
  const [showOverlay, setShowOverlay] = useState(playOverlay);
  const shownCovers = covers.slice(0, SCATTER_POSITIONS.length);

  useEffect(() => {
    if (!playOverlay || phase === "done") return;
    const order: Phase[] = ["packing", "closing", "labeling", "done"];
    const next = order[order.indexOf(phase) + 1] ?? "done";
    const duration = PHASE_DURATIONS_MS[phase as Exclude<Phase, "done">];
    const id = window.setTimeout(() => setPhase(next), duration);
    return () => window.clearTimeout(id);
  }, [phase, playOverlay]);

  useEffect(() => {
    if (phase !== "done" || !playOverlay) return;
    const id = window.setTimeout(() => setShowOverlay(false), 700);
    return () => window.clearTimeout(id);
  }, [phase, playOverlay]);

  const boxClosed = phase === "closing" || phase === "labeling" || phase === "done";
  const labelVisible = phase === "labeling" || phase === "done";

  return (
    <div className="flex flex-col items-center">
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => phase === "done" && setShowOverlay(false)}
          >
            <div className="flex flex-col items-center gap-6 px-6 text-center">
              <PackedBox
                closed={boxClosed}
                labelVisible={labelVisible}
                orderNumber={orderNumber}
                covers={shownCovers}
                size="lg"
              />
              <p className="font-heading text-lg text-background motion-safe:animate-fade-in">
                {phase === "packing" && "Packing your order..."}
                {phase === "closing" && "Sealing the box..."}
                {(phase === "labeling" || phase === "done") && "Ready to ship!"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permanent inline box — always mounted so it's what's left once the
          overlay above fades away, with no layout jump between the two. */}
      <PackedBox closed labelVisible orderNumber={orderNumber} covers={[]} size="md" />
    </div>
  );
}

function PackedBox({
  closed,
  labelVisible,
  orderNumber,
  covers,
  size,
}: {
  closed: boolean;
  labelVisible: boolean;
  orderNumber: string;
  covers: OrderPackCover[];
  size: "lg" | "md";
}) {
  const boxSize = size === "lg" ? 190 : 130;

  return (
    <div className="relative" style={{ width: boxSize, height: boxSize }}>
      {/* Scattered cover thumbnails, only present in the "lg" (overlay) box —
          the permanent inline box never renders these, so it always shows
          as already-packed. */}
      {covers.map((cover, i) => {
        const pos = SCATTER_POSITIONS[i % SCATTER_POSITIONS.length]!;
        return (
          <motion.div
            key={cover.url}
            className="absolute left-1/2 top-1/2 h-16 w-12 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-sm shadow-lg"
            initial={{ x: pos.x, y: pos.y, rotate: pos.rotate, opacity: 1, scale: 1 }}
            animate={{ x: 0, y: 10, rotate: 0, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.7, delay: 0.1 + i * 0.15, ease: [0.4, 0, 0.2, 1] }}
          >
            <Image src={cover.url} alt={cover.title} fill sizes="48px" className="object-cover" />
          </motion.div>
        );
      })}

      {/* Box body */}
      <div
        className="absolute inset-x-0 bottom-0 rounded-sm bg-brand-300 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
        style={{ height: boxSize * 0.62 }}
      >
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-brand-600/40" aria-hidden />
      </div>

      {/* Flaps */}
      <motion.div
        className="absolute left-0 top-0 origin-bottom-left border-b-2 border-brand-600/30 bg-brand-400"
        style={{ width: boxSize * 0.52, height: boxSize * 0.4, bottom: boxSize * 0.62 }}
        animate={{ rotate: closed ? 0 : -35 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 top-0 origin-bottom-right border-b-2 border-brand-600/30 bg-brand-400"
        style={{ width: boxSize * 0.52, height: boxSize * 0.4, bottom: boxSize * 0.62 }}
        animate={{ rotate: closed ? 0 : 35 }}
        transition={{ duration: 0.5, ease: "easeInOut", delay: 0.08 }}
      />

      {/* Tape */}
      <motion.div
        className="absolute inset-x-0 top-0 origin-top bg-brand-700/50"
        style={{ height: boxSize * 0.62, width: boxSize * 0.14, left: "50%", marginLeft: -(boxSize * 0.07) }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: closed ? 1 : 0 }}
        transition={{ duration: 0.35, delay: closed ? 0.35 : 0 }}
      />

      {/* Shipping label */}
      <motion.div
        className={cn(
          "absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 rounded-sm border bg-card px-3 py-2 shadow-md",
        )}
        style={{ top: boxSize * 0.72 }}
        initial={{ opacity: 0, y: -10, scale: 0.85 }}
        animate={labelVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -10, scale: 0.85 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Logo variant="mark" height={16} href={false} />
        <p className="whitespace-nowrap text-[10px] font-medium tracking-wide text-foreground">{orderNumber}</p>
      </motion.div>
    </div>
  );
}
