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
    <footer className="mt-24 border-t bg-secondary/40">
      <div className="container grid gap-10 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo variant="full" height={34} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            The Light of Learning — Sri Lanka&apos;s trusted publishing and distribution company
            since 1994.
          </p>
        </div>
        {footerColumns.map((col) => (
          <div key={col.title}>
            <p className="font-heading text-sm uppercase tracking-wide text-foreground/90">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn("text-sm text-muted-foreground hover:text-accent", navLinkFocusClass)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Sooriya Publishers. All rights reserved.
      </div>
    </footer>
  );
}
