"use client";

import * as React from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminNavLinks } from "@/components/admin/admin-sidebar";
import { cn } from "@/lib/utils";

/** Same slide-in drawer pattern as the storefront's MobileNav — the admin
 *  sidebar used to just be `hidden` below md with no alternative at all, so
 *  there was no way to move between admin sections on a phone. */
export function AdminMobileNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open admin menu" className="md:hidden">
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
          <DialogPrimitive.Title className="sr-only">Admin navigation</DialogPrimitive.Title>
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link href="/admin" onClick={() => setOpen(false)} className="font-heading text-lg">
              Sooriya <span className="text-accent">Admin</span>
            </Link>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu">
                <X className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AdminNavLinks onNavigate={() => setOpen(false)} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
