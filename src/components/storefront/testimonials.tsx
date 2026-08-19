import { Reveal } from "@/components/storefront/reveal";
import { SectionHeading } from "@/components/storefront/section-heading";

/**
 * Real customer testimonials from the live WordPress homepage
 * (sooriyabooks.lk), reproduced verbatim — there is no testimonials table in
 * the migrated schema yet, so this is static content rather than invented
 * copy. Move to a DB-backed admin section if/when one is built.
 */
const TESTIMONIALS = [
  {
    quote:
      "I always buy my children's school books from Sooriya Publishers. The quality is excellent, and I really appreciate their friendly service and fast delivery.",
    name: "Rohan Fernando",
    role: "Parent, Colombo",
  },
  {
    quote:
      "Sooriya Publishers has been our go-to source for school textbooks and educational materials for years. Their books are well-organized, accurate, and always delivered on time. Highly recommended!",
    name: "Mrs. Nadeesha Perera",
    role: "Teacher, Kalutara",
  },
];

export function Testimonials() {
  return (
    <section className="container py-16 md:py-24">
      <SectionHeading eyebrow="Trusted island-wide" title="What readers say" align="center" />
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} index={i}>
            <figure className="h-full rounded-lg border bg-card p-6">
              <blockquote className="font-heading text-lg leading-relaxed text-foreground/90">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t.name}</span> — {t.role}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
