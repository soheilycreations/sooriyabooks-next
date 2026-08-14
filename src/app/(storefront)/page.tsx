import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

// Phase 0 placeholder content. Once Supabase is provisioned (Phase 8), this
// page reads from `homepage_sections`/`homepage_section_items` and the
// `books` table instead of these static arrays — see docs/api-design.md
// and docs/feature-list.md Phase 1.
const PLACEHOLDER_FEATURED_BOOKS = [
  { id: "1", title: "The Village in the Jungle", author: "Leonard Woolf", price: 1450, discountPrice: 1200 },
  { id: "2", title: "Sinhala Short Stories", author: "Martin Wickramasinghe", price: 980, discountPrice: null },
  { id: "3", title: "Island Tales", author: "Various Authors", price: 1650, discountPrice: 1400 },
  { id: "4", title: "The Tea Planter's Daughter", author: "Sarah Jio", price: 1200, discountPrice: null },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b bg-secondary/30">
        <div className="container flex flex-col items-start gap-6 py-20 md:py-28">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Since 1994 &middot; Sri Lanka
          </p>
          <h1 className="max-w-2xl font-heading text-4xl leading-tight md:text-6xl">
            Buy Books to your Doorstep
          </h1>
          <p className="max-w-lg text-muted-foreground">
            Sooriya Publishers is Sri Lanka&apos;s trusted publishing and distribution company —
            island-wide delivery, curated titles, and a modern shopping experience.
          </p>
          <Button size="lg" variant="accent" asChild>
            <Link href="/category/fiction">Shop the Collection</Link>
          </Button>
        </div>
      </section>

      {/* Featured Books */}
      <section className="container py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-heading text-3xl">Featured Books</h2>
          <Link href="/search?featured=1" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {PLACEHOLDER_FEATURED_BOOKS.map((book) => (
            <Card key={book.id} className="group overflow-hidden border-none shadow-none">
              <div className="aspect-[3/4] rounded-lg bg-muted transition-transform group-hover:scale-[1.02]" />
              <CardContent className="px-0 pt-4">
                <p className="font-heading text-base leading-snug">{book.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
                <div className="mt-2 flex items-center gap-2">
                  {book.discountPrice ? (
                    <>
                      <span className="font-medium text-accent">
                        {formatCurrency(book.discountPrice)}
                      </span>
                      <span className="text-sm text-muted-foreground line-through">
                        {formatCurrency(book.price)}
                      </span>
                    </>
                  ) : (
                    <span className="font-medium">{formatCurrency(book.price)}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
