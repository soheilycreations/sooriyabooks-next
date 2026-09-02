"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X, ShoppingBag, BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart-context";
import { formatCurrency, cn } from "@/lib/utils";
import { getShippingOptionsAction, quoteShippingAction } from "@/lib/shipping/actions";
import { loadLastDelivery, saveLastDelivery } from "@/lib/shipping/city-storage";
import type { DistrictWithCities } from "@/lib/shipping/queries";
import { CartWishlistToggle } from "./cart-wishlist-toggle";

const selectClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CartView() {
  const { items, updateQuantity, removeItem, subtotal, totalDiscount, totalWeightGrams, itemCount } = useCart();
  const [districts, setDistricts] = useState<DistrictWithCities[]>([]);
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");
  const [shippingRate, setShippingRate] = useState<number | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getShippingOptionsAction().then(setDistricts);
  }, []);

  // Prefill with whatever city they picked last time, instead of making
  // them re-select it on every visit.
  useEffect(() => {
    if (districts.length === 0 || districtId) return;
    const saved = loadLastDelivery();
    if (!saved) return;
    const district = districts.find((d) => d.id === saved.districtId);
    if (!district) return;
    const city = district.cities.find((c) => c.id === saved.cityId);
    if (!city) return;
    setDistrictId(saved.districtId);
    setCityId(saved.cityId);
  }, [districts, districtId]);

  const selectedDistrict = districts.find((d) => d.id === districtId);

  useEffect(() => {
    if (!cityId || itemCount === 0) {
      setShippingRate(null);
      return;
    }
    startTransition(async () => {
      const result = await quoteShippingAction(cityId, totalWeightGrams);
      if (result.ok) {
        setShippingRate(result.rate);
        setShippingError(null);
      } else {
        setShippingRate(null);
        setShippingError(result.error);
      }
    });
  }, [cityId, totalWeightGrams, itemCount]);

  if (itemCount === 0) {
    return (
      <div className="flex flex-col items-center gap-4 border-y py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/70">
          <ShoppingBag className="h-6 w-6 text-accent" />
        </div>
        <div>
          <p className="font-heading text-2xl">Your cart is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse the collection and find something worth reading.
          </p>
        </div>
        <Button variant="accent" className="mt-2" asChild>
          <Link href="/search">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {items.map((item) => (
          <div key={item.bookId} className="flex gap-5 border-b pb-6">
            <Link
              href={`/book/${item.slug}`}
              className="relative aspect-[3/4] h-32 shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm ring-1 ring-border/60"
            >
              {item.coverUrl && (
                <Image src={item.coverUrl} alt={item.title} fill sizes="96px" className="object-cover" />
              )}
            </Link>
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <Link
                  href={`/book/${item.slug}`}
                  className="font-heading text-base leading-snug tracking-tight hover:text-accent"
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(item.unitPrice)} each</p>
                <div className="mt-2">
                  <CartWishlistToggle bookId={item.bookId} />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex h-9 items-center rounded-full border border-input">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => updateQuantity(item.bookId, item.quantity - 1)}
                    className="flex h-full w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-medium" aria-live="polite">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => updateQuantity(item.bookId, item.quantity + 1)}
                    className="flex h-full w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium">{formatCurrency(item.unitPrice * item.quantity)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${item.title} from cart`}
                    onClick={() => removeItem(item.bookId)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="h-fit rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="font-heading text-xl">Order Summary</h2>
        <div className="mt-3 h-px w-10 bg-accent" aria-hidden />

        <div className="mt-5 space-y-2">
          <label htmlFor="cart-district" className="text-sm font-medium">
            District
          </label>
          <select
            id="cart-district"
            className={selectClass}
            value={districtId}
            onChange={(e) => {
              setDistrictId(e.target.value);
              setCityId("");
            }}
          >
            <option value="">Select district</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {selectedDistrict && (
            <>
              <label htmlFor="cart-city" className="text-sm font-medium">
                City
              </label>
              <select
                id="cart-city"
                className={cn(selectClass, "border-accent")}
                value={cityId}
                onChange={(e) => {
                  setCityId(e.target.value);
                  if (e.target.value) saveLastDelivery(districtId, e.target.value);
                }}
              >
                <option value="">Select city</option>
                {selectedDistrict.cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="mt-6 space-y-2 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-accent">-{formatCurrency(totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Courier Charge ({(totalWeightGrams / 1000).toFixed(2)}kg)</span>
            <span>
              {isPending ? "Calculating..." : shippingRate != null ? formatCurrency(shippingRate) : "—"}
            </span>
          </div>
          {shippingError && <p className="text-xs text-destructive">{shippingError}</p>}
          <div className="flex items-baseline justify-between border-t pt-3">
            <span className="font-heading text-base">Total</span>
            <span className="font-heading text-xl text-accent">
              {formatCurrency(subtotal + (shippingRate ?? 0))}
            </span>
          </div>
        </div>

        {totalDiscount > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent">
            <BadgePercent className="h-4 w-4 shrink-0" aria-hidden />
            You&apos;re saving {formatCurrency(totalDiscount)} on this order!
          </div>
        )}

        <Button
          className="mt-6 w-full"
          variant="accent"
          size="lg"
          disabled={!cityId || shippingRate == null}
          asChild
        >
          <Link href={`/checkout?cityId=${cityId}`}>Proceed to Checkout</Link>
        </Button>
      </div>
    </div>
  );
}
