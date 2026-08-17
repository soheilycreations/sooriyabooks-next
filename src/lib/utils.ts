import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
