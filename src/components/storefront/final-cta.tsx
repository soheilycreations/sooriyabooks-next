import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/storefront/reveal";

export function FinalCta() {
  return (
    <section className="border-t bg-foreground text-background">
      <div className="container py-16 text-center md:py-24">
        <Reveal>
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-accent">
            The Light of Learning
          </p>
          <h2 className="mx-auto max-w-xl font-heading text-3xl leading-tight md:text-4xl md:leading-tight">
            Your next favourite book is on the shelf
          </h2>
          <p className="mx-auto mt-4 max-w-md text-background/70">
            Island-wide delivery, curated titles, and three decades of publishing behind every
            page.
          </p>
          <Button size="lg" variant="accent" asChild className="mt-8">
            <Link href="/search">Explore the Collection</Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
