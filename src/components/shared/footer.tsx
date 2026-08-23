import Link from "next/link";
import { Logo } from "@/components/shared/logo";
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

export async function Footer() {
  const shopLinks = await getShopLinks();
  const footerColumns = [{ title: "Shop", links: shopLinks }, ...FOOTER_COLUMNS_STATIC];

  return (
    // No top margin — every page's last section already carries its own
    // bottom padding, so an additional margin here only stacked into extra
    // whitespace (the same pattern fixed for the homepage's own sections).
    <footer className="border-t bg-secondary/40">
      <div className="h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" aria-hidden />
      <div className="container grid gap-10 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo variant="full" height={34} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            The Light of Learning — Sri Lanka&apos;s trusted publishing and distribution company
            since <span className="font-medium text-foreground">1994</span>.
          </p>
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
        <div className="container flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Sooriya Publishers. All rights reserved.</p>
          <p className="uppercase tracking-[0.15em] text-muted-foreground/70">The Light of Learning</p>
        </div>
      </div>
    </footer>
  );
}
