"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, FolderTree, Users, ShoppingCart, Ticket,
  Boxes, Star, Image as ImageIcon, Newspaper, Search, Settings,
  Truck, CreditCard, BarChart3, ScrollText, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/authors", label: "Authors", icon: Users },
      { href: "/admin/publishers", label: "Publishers", icon: Users },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/coupons", label: "Coupons", icon: Ticket },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
      { href: "/admin/messages", label: "Messages", icon: Mail },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/media", label: "Media", icon: ImageIcon },
      { href: "/admin/blog", label: "Blog", icon: Newspaper },
      { href: "/admin/seo", label: "SEO", icon: Search },
      { href: "/admin/homepage", label: "Homepage Banners", icon: LayoutDashboard },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/shipping", label: "Shipping", icon: Truck },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/logs", label: "System Logs", icon: ScrollText },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/admin" className="font-heading text-lg">
          Sooriya <span className="text-accent">Admin</span>
        </Link>
      </div>
      <nav className="space-y-6 p-4">
        {NAV_SECTIONS.map((section, i) => (
          <div key={i}>
            {section.title && (
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/70 hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
