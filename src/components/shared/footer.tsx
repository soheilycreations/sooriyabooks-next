import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

async function getShopLinks() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("name, slug").is("parent_id", null).order("sort_order").limit(3);
  return [
    ...(data ?? []).map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
    { href: "/search?featured=1", label: "Featured Books" },
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
      <div className="container grid gap-10 py-16 md:grid-cols-4">
        <div>
          <p className="font-heading text-xl">Sooriya Publishers</p>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Buy Books to your Doorstep — Sri Lanka&apos;s trusted publishing and distribution
            company since 1994.
          </p>
        </div>
        {footerColumns.map((col) => (
          <div key={col.title}>
            <p className="font-medium">{col.title}</p>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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
