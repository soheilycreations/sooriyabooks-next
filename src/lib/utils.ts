import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Branded focus-visible ring for plain text nav links (header, mobile drawer,
 * footer) — matches the ring Button already uses, per docs/design-system.md
 * §8. Not applied to body-copy links, only navigation-role links.
 */
export const navLinkFocusClass =
  "rounded-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function formatCurrency(amount: number, currency = "LKR") {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

/**
 * Strips characters with special meaning in PostgREST's filter syntax
 * (`,()*`) from user-supplied search input before it's interpolated into an
 * `.or()`/`.ilike()` filter string — otherwise a crafted query could inject
 * additional filter clauses (PostgREST filter injection, not classic SQL
 * injection, but the same class of bug: never build a query filter by
 * string-concatenating untrusted input).
 */
export function sanitizeSearchTerm(input: string): string {
  return input.replace(/[,()*]/g, "").trim().slice(0, 100);
}

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#039": "'",
  nbsp: " ",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

/**
 * Some catalog content (categories, authors, publishers, book titles/
 * descriptions) was migrated from the legacy WordPress/WooCommerce site
 * with HTML entities left un-decoded in the stored text (e.g. a category
 * literally named "Academic &amp; Research" in the database). Decoding at
 * render time fixes this without touching the underlying data.
 */
export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+\d*);/g, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    return HTML_ENTITY_MAP[entity] ?? match;
  });
}
