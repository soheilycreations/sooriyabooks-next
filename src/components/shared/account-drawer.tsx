"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Package, Heart, MapPin, User, X, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAccountSummaryAction } from "@/lib/auth/account-actions";
import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const QUICK_LINKS = [
  { href: "/account/orders", label: "Orders", description: "Track and review past orders", icon: Package },
  { href: "/account/wishlist", label: "Wishlist", description: "Books you've saved", icon: Heart },
  { href: "/account/addresses", label: "Addresses", description: "Saved delivery addresses", icon: MapPin },
  { href: "/account/profile", label: "Profile", description: "Your account details", icon: User },
];

/** Same getCurrentUser()/signOutAction() every other account surface uses —
 *  this is a presentation-only view onto the existing session, not a second
 *  auth system. Portaled for the same stacking-context reason as the other
 *  header drawers. */
export function AccountDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getAccountSummaryAction().then((result) => {
      setEmail(result?.email ?? null);
      setLoading(false);
    });
  }, [open]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={cn(
          "fixed inset-0 z-[100] bg-black/40 transition-opacity duration-300 ease-premium",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your account"
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-[101] flex h-full w-full max-w-[420px] flex-col border-l bg-background shadow-2xl transition-transform duration-300 ease-premium",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b px-6 py-5">
          <h2 className="font-heading text-xl">My Account</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close account menu"
            tabIndex={open ? 0 : -1}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !email ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/70">
              <User className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="font-heading text-xl">Sign in to your account</p>
              <p className="mt-1 text-sm text-muted-foreground">Track orders, manage addresses, and more.</p>
            </div>
            <Button variant="accent" tabIndex={open ? 0 : -1} onClick={() => go("/login")}>
              Sign In
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="text-sm text-muted-foreground">
                Welcome back, <span className="font-medium text-foreground">{email}</span>.
              </p>
              <ul className="mt-6 space-y-2">
                {QUICK_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      tabIndex={open ? 0 : -1}
                      onClick={() => onOpenChange(false)}
                      className="flex items-start gap-3 rounded-lg border p-3.5 transition-colors hover:border-accent hover:bg-accent/5"
                    >
                      <link.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                      <div>
                        <p className="text-sm font-medium">{link.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{link.description}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t px-6 py-5">
              <form action={signOutAction}>
                <Button variant="outline" size="lg" type="submit" className="w-full gap-2" tabIndex={open ? 0 : -1}>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}
