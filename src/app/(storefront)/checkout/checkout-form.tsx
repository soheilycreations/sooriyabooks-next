"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/lib/cart/cart-context";
import { formatCurrency } from "@/lib/utils";
import { createOrder } from "@/lib/orders/actions";
import { initiateBankPayment } from "@/lib/payments/actions";
import { quoteShippingAction } from "@/lib/shipping/actions";

export function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, subtotal, totalWeightGrams, clear } = useCart();
  const cityId = searchParams.get("cityId") ?? "";

  const [shippingRate, setShippingRate] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank_ipg">("cod");
  const [address, setAddress] = useState({
    recipientName: "",
    phone: "",
    line1: "",
    line2: "",
    postalCode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!cityId) return;
    quoteShippingAction(cityId, totalWeightGrams).then((r) => {
      if (r.ok) setShippingRate(r.rate);
    });
  }, [cityId, totalWeightGrams]);

  if (!cityId) {
    return (
      <p className="text-muted-foreground">
        No delivery city selected. <Link href="/cart" className="text-accent hover:underline">Go back to your cart</Link>.
      </p>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createOrder({
        items: items.map((i) => ({ bookId: i.bookId, quantity: i.quantity })),
        cityId,
        newAddress: address,
        paymentMethod,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      clear();

      if (paymentMethod === "bank_ipg") {
        const paymentResult = await initiateBankPayment(result.data.orderId);
        if (paymentResult.ok) {
          window.location.href = paymentResult.data.redirectUrl;
          return;
        }
        // Order exists but the gateway couldn't be reached — let the
        // customer see it and retry payment from there rather than losing
        // the order entirely.
        setError(`${paymentResult.error} — your order was saved, you can retry payment from your order page.`);
        router.push(`/account/orders/${result.data.orderId}`);
        return;
      }

      router.push(`/account/orders/${result.data.orderId}?placed=1`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Address</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="recipientName">Full name</Label>
              <Input
                id="recipientName"
                required
                value={address.recipientName}
                onChange={(e) => setAddress((a) => ({ ...a, recipientName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                required
                value={address.phone}
                onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="postalCode">Postal code</Label>
              <Input
                id="postalCode"
                value={address.postalCode}
                onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="line1">Address line 1</Label>
              <Input
                id="line1"
                required
                value={address.line1}
                onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="line2">Address line 2 (optional)</Label>
              <Input
                id="line2"
                value={address.line2}
                onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-3 rounded-md border p-4 has-[:checked]:border-accent">
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
              />
              <div>
                <p className="font-medium">Cash on Delivery</p>
                <p className="text-sm text-muted-foreground">Pay when your order arrives</p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-md border p-4 has-[:checked]:border-accent">
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === "bank_ipg"}
                onChange={() => setPaymentMethod("bank_ipg")}
              />
              <div>
                <p className="font-medium">Bank Payment Gateway</p>
                <p className="text-sm text-muted-foreground">
                  Pay securely online (redirect to bank gateway after order confirmation)
                </p>
              </div>
            </label>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-heading text-xl">Order Summary</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{shippingRate != null ? formatCurrency(shippingRate) : "—"}</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-medium">
            <span>Total</span>
            <span>{formatCurrency(subtotal + (shippingRate ?? 0))}</span>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <Button type="submit" variant="accent" size="lg" className="mt-6 w-full" disabled={isPending}>
          {isPending ? "Placing order..." : "Place Order"}
        </Button>
      </div>
    </form>
  );
}
