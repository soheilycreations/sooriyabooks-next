"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Loader2 } from "lucide-react";
import { searchBooksAction } from "@/lib/catalog/search-actions";
import { formatCurrency, cn } from "@/lib/utils";
import type { BookCardData } from "@/lib/catalog/queries";

export function SearchOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookCardData[]>([]);
  const [isPending, startTransition] = useTransition();
  const hasSearched = query.trim().length > 0;

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      return;
    }
    const id = setTimeout(() => {
      startTransition(async () => {
        const data = await searchBooksAction(term);
        setResults(data);
      });
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  function goToFullResults(e: React.FormEvent) {
    e.preventDefault();
    const term = query.trim();
    onOpenChange(false);
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  }

  function goToBook(slug: string) {
    onOpenChange(false);
    router.push(`/book/${slug}`);
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] bg-background transition-opacity duration-300 ease-premium",
        open ? "visible opacity-100" : "invisible opacity-0",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="container flex h-full flex-col py-6 md:py-10">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">Search</p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close search"
            tabIndex={open ? 0 : -1}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-auto mt-8 w-full max-w-2xl md:mt-14">
          <form onSubmit={goToFullResults} role="search" className="relative border-b-2 border-foreground/80 pb-3">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you looking for?"
              aria-label="Search books, authors, ISBN"
              tabIndex={open ? 0 : -1}
              className="w-full bg-transparent font-heading text-2xl leading-tight tracking-tight text-foreground outline-none placeholder:text-muted-foreground/60 md:text-4xl lg:text-5xl"
            />
            <button
              type="submit"
              aria-label="Search"
              tabIndex={open ? 0 : -1}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-accent"
            >
              {isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Search className="h-6 w-6" />}
            </button>
          </form>
        </div>

        <div className="mx-auto mt-10 w-full max-w-2xl flex-1 overflow-y-auto pb-10">
          {!hasSearched && (
            <p className="text-center text-sm text-muted-foreground">
              Search by title, author name, or ISBN.
            </p>
          )}

          {hasSearched && isPending && results.length === 0 && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {hasSearched && !isPending && results.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Nothing matched &ldquo;{query.trim()}&rdquo; — try a different title, author, or ISBN.
            </p>
          )}

          {results.length > 0 && (
            <ul className="divide-y">
              {results.map((book) => {
                const isOnSale = book.discountPrice != null && book.discountPrice < book.sellingPrice;
                return (
                  <li key={book.id}>
                    <button
                      type="button"
                      tabIndex={open ? 0 : -1}
                      onClick={() => goToBook(book.slug)}
                      className="flex w-full items-center gap-4 py-3 text-left transition-colors hover:bg-secondary/50"
                    >
                      <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                        {book.coverUrl && (
                          <Image src={book.coverUrl} alt="" fill sizes="48px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-heading text-base leading-snug">{book.title}</p>
                        {book.authorName && (
                          <p className="truncate text-sm text-muted-foreground">{book.authorName}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {isOnSale ? (
                          <>
                            <p className="font-medium text-accent">{formatCurrency(book.discountPrice!)}</p>
                            <p className="text-xs text-muted-foreground line-through">
                              {formatCurrency(book.sellingPrice)}
                            </p>
                          </>
                        ) : (
                          <p className="font-medium">{formatCurrency(book.sellingPrice)}</p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {hasSearched && results.length > 0 && (
            <div className="mt-6 text-center">
              <Link
                href={`/search?q=${encodeURIComponent(query.trim())}`}
                tabIndex={open ? 0 : -1}
                onClick={() => onOpenChange(false)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                See all results for &ldquo;{query.trim()}&rdquo;
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
