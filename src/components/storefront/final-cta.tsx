import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/storefront/reveal";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t bg-foreground text-background">
      {/* Faint radial glow behind the closing statement — a restrained, single accent
          touch rather than a decorative image, in keeping with the dark section's tone. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl"
      />
      <div className="container py-16 text-center md:py-24">
        <Reveal>
          <p className="mb-4 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-accent">
            <span className="h-px w-8 bg-accent" aria-hidden />
            The Light of Learning
            <span className="h-px w-8 bg-accent" aria-hidden />
          </p>
          <h2 className="mx-auto max-w-2xl text-balance font-heading text-4xl leading-tight md:text-5xl md:leading-tight">
            Your next favourite book is on the shelf
          </h2>
          <p className="mx-auto mt-5 max-w-md leading-relaxed text-background/70">
            Island-wide delivery, curated titles, and three decades of publishing behind every
            page.
          </p>
          <Button
            size="lg"
            variant="accent"
            asChild
            className="mt-9 px-10 shadow-lg shadow-accent/20 transition-transform duration-300 ease-premium hover:scale-[1.02]"
          >
            <Link href="/search">Explore the Collection</Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
