"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Real catalogue PDF, hosted in the same Supabase Storage `media` bucket
 * every other real asset on this site uses (see src/lib/media/actions.ts's
 * publicUrlFor) — not bundled into the app itself, which would bloat the
 * repo and every deploy with a 50MB+ binary.
 */
const CATALOGUE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/brochures/sooriya-catalogue.pdf`;

/**
 * Opens the real catalogue in a book-framed modal — a native PDF viewer
 * (full pagination, zoom, search, works everywhere) inside a spine-shadowed
 * frame that reads as a book rather than a bare document. A true animated
 * page-turn effect would need every one of the catalogue's 500+ pages
 * pre-rendered to images, which is a heavy asset pipeline of its own; this
 * gets the "open like a book" feel without that cost.
 */
export function CatalogueViewer() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <Button
        size="lg"
        variant="outline"
        onClick={() => setOpen(true)}
        className="mt-9 gap-2 border-background/30 bg-transparent text-background transition-colors hover:bg-background/10 md:ml-3"
      >
        <BookOpen className="h-4 w-4" />
        View Our Catalogue
      </Button>

      {mounted &&
        createPortal(
          <>
            <div
              className={cn(
                "fixed inset-0 z-[100] bg-black/70 transition-opacity duration-300 ease-premium",
                open ? "visible opacity-100" : "invisible opacity-0",
              )}
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Sooriya Publishers catalogue"
              aria-hidden={!open}
              className={cn(
                "forced-light fixed inset-4 z-[101] flex flex-col overflow-hidden rounded-xl bg-background shadow-2xl transition-all duration-300 ease-premium md:inset-x-[8%] md:inset-y-[4%]",
                open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
              )}
              style={{
                // A stack of thin offset shadows down the left edge — reads as
                // a bound spine of pages rather than a flat document window.
                boxShadow:
                  "-3px 0 0 0 rgba(0,0,0,0.06), -6px 0 0 0 rgba(0,0,0,0.05), -9px 0 0 0 rgba(0,0,0,0.04)",
              }}
            >
              <div className="flex shrink-0 items-center justify-between border-b bg-brand-50 px-5 py-3">
                <p className="flex items-center gap-2 font-heading text-lg text-foreground">
                  <BookOpen className="h-4 w-4 text-accent" />
                  Sooriya Publishers Catalogue
                </p>
                <div className="flex items-center gap-1">
                  <a
                    href={CATALOGUE_URL}
                    download
                    className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label="Download catalogue PDF"
                    tabIndex={open ? 0 : -1}
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close catalogue"
                    tabIndex={open ? 0 : -1}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 bg-secondary/40">
                {open && (
                  <iframe
                    src={`${CATALOGUE_URL}#view=FitH`}
                    title="Sooriya Publishers catalogue"
                    className="h-full w-full"
                  />
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
