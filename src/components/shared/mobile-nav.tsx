"use client";

import * as React from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Menu, X, Heart, User, Package, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import type { NavCategory } from "@/lib/catalog/nav-categories";
import { cn, navLinkFocusClass } from "@/lib/utils";

export type { NavCategory };

const drawerLinkClass = cn(
  "block border-b py-3.5 font-heading text-lg text-foreground/90 hover:text-accent",
  navLinkFocusClass,
);

export function MobileNav({ categories }: { categories: NavCategory[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        {/* Full nav needs >=lg to fit without collision (see header-client.tsx) — this
            drawer is the nav pattern for everything below that, not just phone widths. */}
        <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-full w-full max-w-xs flex-col bg-background shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
            "duration-300 ease-premium",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Site navigation</DialogPrimitive.Title>
          <div className="flex h-20 items-center justify-between border-b px-5">
            <Logo variant="full" height={30} href={false} />
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu">
                <X className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <nav className="flex-1 overflow-y-auto px-5 py-6" aria-label="Site">
            <ul className="flex flex-col">
              <li>
                <Link href="/" onClick={() => setOpen(false)} className={drawerLinkClass}>
                  Home
                </Link>
              </li>
            </ul>
            <AccordionPrimitive.Root type="single" collapsible defaultValue="shop">
              <AccordionPrimitive.Item value="shop" className="border-b">
                <AccordionPrimitive.Header>
                  <AccordionPrimitive.Trigger
                    className={cn(
                      "flex w-full items-center justify-between py-3.5 font-heading text-lg text-foreground/90 hover:text-accent",
                      "[&[data-state=open]>svg]:rotate-180",
                      navLinkFocusClass,
                    )}
                  >
                    Shop
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 ease-premium" />
                  </AccordionPrimitive.Trigger>
                </AccordionPrimitive.Header>
                <AccordionPrimitive.Content className="overflow-hidden pb-2 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <ul className="flex flex-col pl-1">
                    <li>
                      <Link href="/search" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-muted-foreground hover:text-accent">
                        All Books
                      </Link>
                    </li>
                    <li>
                      <Link href="/search?new=1" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-muted-foreground hover:text-accent">
                        New Arrivals
                      </Link>
                    </li>
                    <li>
                      <Link href="/search?featured=1" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-muted-foreground hover:text-accent">
                        Featured Books
                      </Link>
                    </li>
                    <li className="mt-1 pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Sooriya Books
                    </li>
                    {categories.map((cat) => (
                      <li key={cat.slug}>
                        <Link
                          href={`/category/${cat.slug}`}
                          onClick={() => setOpen(false)}
                          className="block py-2.5 text-sm text-muted-foreground hover:text-accent"
                        >
                          {cat.name}
                        </Link>
                      </li>
                    ))}
                    <li className="mt-1 pt-1">
                      <Link
                        href="/categories"
                        onClick={() => setOpen(false)}
                        className="block py-2.5 text-sm font-medium text-accent hover:underline"
                      >
                        Browse All Categories
                      </Link>
                    </li>
                  </ul>
                </AccordionPrimitive.Content>
              </AccordionPrimitive.Item>
            </AccordionPrimitive.Root>

            <ul className="flex flex-col">
              <li>
                <Link href="/blog" onClick={() => setOpen(false)} className={cn(drawerLinkClass, "border-b-0")}>
                  Blog
                </Link>
              </li>
            </ul>
          </nav>

          <div className="flex items-center justify-around border-t px-5 py-4">
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex flex-col items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <User className="h-5 w-5" />
              Account
            </Link>
            <Link
              href="/account/orders"
              onClick={() => setOpen(false)}
              className="flex flex-col items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Package className="h-5 w-5" />
              Orders
            </Link>
            <Link
              href="/account/wishlist"
              onClick={() => setOpen(false)}
              className="flex flex-col items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Heart className="h-5 w-5" />
              Wishlist
            </Link>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
