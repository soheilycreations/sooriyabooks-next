import type { Metadata } from "next";
import { BrandStory } from "@/components/storefront/brand-story";
import { FinalCta } from "@/components/storefront/final-cta";
import { Reveal } from "@/components/storefront/reveal";
import { getStoreStats } from "@/lib/catalog/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Sooriya Publishers — Sri Lanka's publishing and distribution company since 1994. The Light of Learning.",
};

export default async function AboutPage() {
  const stats = await getStoreStats();

  return (
    <div>
      <div className="container py-16 text-center md:py-24">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-accent">About Sooriya Publishers</p>
          <h1 className="mx-auto mt-3 max-w-2xl font-heading text-4xl leading-tight md:text-6xl md:leading-tight">
            The Light of Learning
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Sooriya Publishers is Sri Lanka&apos;s publishing and distribution company — this storefront is where
            that same collection now lives online.
          </p>
        </Reveal>
      </div>

      <BrandStory stats={stats} />
      <FinalCta />
    </div>
  );
}
