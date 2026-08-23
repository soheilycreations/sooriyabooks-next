import Link from "next/link";
import { Truck, Headphones, ShieldCheck, Instagram } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { BackToTop } from "@/components/shared/back-to-top";
import { selectNavCategories } from "@/lib/catalog/nav-categories";
import { createClient } from "@/lib/supabase/server";
import { cn, navLinkFocusClass } from "@/lib/utils";

// Same top-level category slice + filtering as the header nav
// (src/components/shared/header.tsx) so "Shop" here and the primary nav
// never disagree about what the top categories are.
async function getShopLinks() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("name, slug").is("parent_id", null).order("sort_order").limit(20);
  const categories = selectNavCategories(data ?? [], 6);
  return [
    ...categories.map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
    { href: "/search", label: "All Books" },
  ];
}

const FOOTER_COLUMNS_STATIC = [
  {
    title: "Customer Care",
    links: [
      { href: "/account/orders", label: "Track Order" },
      { href: "/contact", label: "Contact Us" },
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "About Sooriya Publishers" },
      { href: "/blog", label: "Blog" },
    ],
  },
];

// Same three service commitments the previous site's footer promised —
// real, existing claims (island-wide delivery already appears in the
// homepage hero copy), just given a proper icon treatment here instead of
// being invented fresh.
const TRUST_POINTS = [
  { icon: Truck, title: "Island-Wide Delivery", description: "Within 2 to 5 working days" },
  { icon: Headphones, title: "Customer Support", description: "We're here to help with any question" },
  { icon: ShieldCheck, title: "Secure Payment", description: "100% safe checkout, no hidden charges" },
];

export async function Footer() {
  const shopLinks = await getShopLinks();
  const footerColumns = [{ title: "Shop", links: shopLinks }, ...FOOTER_COLUMNS_STATIC];

  return (
    // No top margin — every page's last section already carries its own
    // bottom padding, so an additional margin here only stacked into extra
    // whitespace (the same pattern fixed for the homepage's own sections).
    <footer className="border-t bg-secondary/40">
      <div className="h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" aria-hidden />

      <div className="border-b border-border/70">
        <div className="container grid grid-cols-1 gap-6 py-8 sm:grid-cols-3">
          {TRUST_POINTS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-heading text-sm text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container grid gap-10 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo variant="full" height={34} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            The Light of Learning — Sri Lanka&apos;s trusted publishing and distribution company
            since <span className="font-medium text-foreground">1994</span>.
          </p>
          <a
            href="https://instagram.com/sooriyabooks"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "mt-5 inline-flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-accent hover:text-accent",
              navLinkFocusClass,
            )}
            aria-label="Sooriya Publishers on Instagram"
          >
            <Instagram className="h-4 w-4" />
          </a>
        </div>
        {footerColumns.map((col) => (
          <div key={col.title}>
            <p className="flex items-center gap-2 font-heading text-sm uppercase tracking-[0.15em] text-foreground/90">
              <span className="h-3 w-px bg-accent" aria-hidden />
              {col.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "group inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-accent",
                      navLinkFocusClass,
                    )}
                  >
                    <span className="max-w-0 overflow-hidden text-accent opacity-0 transition-all duration-200 ease-premium group-hover:mr-1.5 group-hover:max-w-[0.6em] group-hover:opacity-100">
                      →
                    </span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Sooriya Publishers. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <p className="uppercase tracking-[0.15em] text-muted-foreground/70">The Light of Learning</p>
            <BackToTop />
          </div>
        </div>
      </div>
    </footer>
  );
}
