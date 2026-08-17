"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart-context";
import { formatCurrency } from "@/lib/utils";
import { getShippingOptionsAction, quoteShippingAction } from "@/lib/shipping/actions";
import type { DistrictWithCities } from "@/lib/shipping/queries";

export function CartView() {
  const { items, updateQuantity, removeItem, subtotal, totalWeightGrams, itemCount } = useCart();
  const [districts, setDistricts] = useState<DistrictWithCities[]>([]);
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");
  const [shippingRate, setShippingRate] = useState<number | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getShippingOptionsAction().then(setDistricts);
  }, []);

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
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button className="mt-6" asChild>
          <Link href="/">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {items.map((item) => (
          <div key={item.bookId} className="flex gap-4 border-b pb-6">
            <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
              {item.coverUrl && (
                <Image src={item.coverUrl} alt={item.title} fill sizes="80px" className="object-cover" />
              )}
            </div>
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <Link href={`/book/${item.slug}`} className="font-medium hover:underline">
                  {item.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(item.unitPrice)} each</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.bookId, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.bookId, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium">{formatCurrency(item.unitPrice * item.quantity)}</span>
                  <button
                    aria-label="Remove"
                    onClick={() => removeItem(item.bookId)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-heading text-xl">Order Summary</h2>

        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium">District</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              <label className="text-sm font-medium">City</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
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
            <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping ({(totalWeightGrams / 1000).toFixed(2)}kg)</span>
            <span>
              {isPending ? "Calculating..." : shippingRate != null ? formatCurrency(shippingRate) : "—"}
            </span>
          </div>
          {shippingError && <p className="text-xs text-destructive">{shippingError}</p>}
          <div className="flex justify-between border-t pt-2 font-medium">
            <span>Total</span>
            <span>{formatCurrency(subtotal + (shippingRate ?? 0))}</span>
          </div>
        </div>

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
