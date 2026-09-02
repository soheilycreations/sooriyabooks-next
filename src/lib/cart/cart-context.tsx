"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getOriginalPrices } from "./actions";

export interface CartItem {
  bookId: string;
  slug: string;
  title: string;
  unitPrice: number;
  /** Pre-discount selling price — equal to unitPrice when the book has no
   *  discount. Kept alongside unitPrice (the effective price actually
   *  charged) so the cart/checkout can show real total savings without a
   *  second fetch back to the book's own price fields. */
  originalPrice: number;
  weightGrams: number;
  coverUrl: string | null;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (bookId: string, quantity: number) => void;
  removeItem: (bookId: string) => void;
  clear: () => void;
  subtotal: number;
  /** Sum of (originalPrice - unitPrice) * quantity across the cart — 0 when nothing's discounted. */
  totalDiscount: number;
  totalWeightGrams: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "sooriyabooks_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // corrupted local storage — start fresh rather than crash the app
    } finally {
      setHydrated(true);
    }
  }, []);

  // Cart items saved before `originalPrice` existed on CartItem are missing
  // it entirely, which silently hides any real discount on those books —
  // backfill it from the book's current selling price so savings still show.
  useEffect(() => {
    if (!hydrated) return;
    const staleIds = items.filter((i) => typeof i.originalPrice !== "number" || Number.isNaN(i.originalPrice)).map((i) => i.bookId);
    if (staleIds.length === 0) return;
    getOriginalPrices(staleIds).then((prices) => {
      setItems((prev) =>
        prev.map((i) => {
          const price = prices[i.bookId];
          return price != null ? { ...i, originalPrice: price } : i;
        }),
      );
    });
    // Only needs to run once per hydration — re-running on every `items`
    // change would refetch on every quantity tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.bookId === item.bookId);
      if (existing) {
        return prev.map((i) =>
          i.bookId === item.bookId ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [...prev, { ...item, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((bookId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.bookId !== bookId)
        : prev.map((i) => (i.bookId === bookId ? { ...i, quantity } : i)),
    );
  }, []);

  const removeItem = useCallback((bookId: string) => {
    setItems((prev) => prev.filter((i) => i.bookId !== bookId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const { subtotal, totalDiscount, totalWeightGrams, itemCount } = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal + item.unitPrice * item.quantity,
        totalDiscount: acc.totalDiscount + Math.max(0, item.originalPrice - item.unitPrice) * item.quantity,
        totalWeightGrams: acc.totalWeightGrams + item.weightGrams * item.quantity,
        itemCount: acc.itemCount + item.quantity,
      }),
      { subtotal: 0, totalDiscount: 0, totalWeightGrams: 0, itemCount: 0 },
    );
  }, [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQuantity, removeItem, clear, subtotal, totalDiscount, totalWeightGrams, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
