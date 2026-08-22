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
    <section className="border-t bg-secondary/40">
      <div className="container py-14 md:py-20">
        <SectionHeading eyebrow="Trusted island-wide" title="What readers say" align="center" />
        <div className="mx-auto grid max-w-4xl divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} index={i}>
              <figure className="relative flex h-full flex-col px-2 py-8 md:px-10 md:py-2">
                <span
                  aria-hidden
                  className="select-none font-heading text-6xl leading-none text-accent/25"
                >
                  &ldquo;
                </span>
                <blockquote className="-mt-4 font-heading text-lg leading-relaxed text-foreground/90 md:text-xl">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-2 text-sm">
                  <span className="h-px w-5 bg-accent" aria-hidden />
                  <span className="font-medium text-foreground">{t.name}</span>
                  <span className="text-muted-foreground">— {t.role}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
