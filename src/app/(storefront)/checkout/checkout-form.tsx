"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormAlert } from "@/components/shared/form-alert";
import { useCart } from "@/lib/cart/cart-context";
import { formatCurrency, cn } from "@/lib/utils";
import { createOrder } from "@/lib/orders/actions";
import { initiateBankPayment } from "@/lib/payments/actions";
import { quoteShippingAction, getShippingOptionsAction } from "@/lib/shipping/actions";
import type { DistrictWithCities } from "@/lib/shipping/queries";

const selectClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, subtotal, totalWeightGrams, clear } = useCart();
  const cityId = searchParams.get("cityId") ?? "";

  const [districts, setDistricts] = useState<DistrictWithCities[]>([]);
  const [cityLabel, setCityLabel] = useState<string | null>(null);
  const [shippingRate, setShippingRate] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank_ipg" | "bank_transfer">("cod");
  const [address, setAddress] = useState({
    recipientName: "",
    phone: "",
    line1: "",
    line2: "",
    postalCode: "",
  });

  // "Ship to a different address" — for someone ordering as a gift for
  // someone else. The recipient may be in a different city entirely, so
  // this gets its own district/city pick and its own shipping quote,
  // rather than assuming the city already chosen on the cart page.
  const [shipToDifferentAddress, setShipToDifferentAddress] = useState(false);
  const [giftDistrictId, setGiftDistrictId] = useState("");
  const [giftCityId, setGiftCityId] = useState("");
  const [giftShippingRate, setGiftShippingRate] = useState<number | null>(null);
  const [gift, setGift] = useState({
    firstName: "",
    surname: "",
    line1: "",
    line2: "",
    contact: "",
    email: "",
    specialInstructions: "",
  });
  const [acceptedDeliveryPolicy, setAcceptedDeliveryPolicy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getShippingOptionsAction().then(setDistricts);
  }, []);

  useEffect(() => {
    if (!cityId) return;
    quoteShippingAction(cityId, totalWeightGrams).then((r) => {
      if (r.ok) setShippingRate(r.rate);
    });
  }, [cityId, totalWeightGrams]);

  useEffect(() => {
    if (districts.length === 0 || !cityId) return;
    for (const d of districts) {
      const city = d.cities.find((c) => c.id === cityId);
      if (city) {
        setCityLabel(`${city.name}, ${d.name}`);
        break;
      }
    }
  }, [districts, cityId]);

  useEffect(() => {
    if (!shipToDifferentAddress || !giftCityId) {
      setGiftShippingRate(null);
      return;
    }
    quoteShippingAction(giftCityId, totalWeightGrams).then((r) => {
      if (r.ok) setGiftShippingRate(r.rate);
      else setGiftShippingRate(null);
    });
  }, [shipToDifferentAddress, giftCityId, totalWeightGrams]);

  if (!cityId) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No delivery city selected.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/cart">Go back to your cart</Link>
        </Button>
      </div>
    );
  }

  const giftDistrict = districts.find((d) => d.id === giftDistrictId);
  const effectiveShippingRate = shipToDifferentAddress ? giftShippingRate : shippingRate;
  const giftFieldsReady =
    !shipToDifferentAddress ||
    Boolean(giftCityId && giftShippingRate != null && gift.firstName && gift.surname && gift.line1 && gift.contact && gift.email);
  const canSubmit = acceptedDeliveryPolicy && giftFieldsReady;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const usingGift = shipToDifferentAddress;
      const noteParts = usingGift
        ? [`Gift recipient email: ${gift.email}`, gift.specialInstructions ? `Note: ${gift.specialInstructions}` : null]
        : [];

      const result = await createOrder({
        items: items.map((i) => ({ bookId: i.bookId, quantity: i.quantity })),
        cityId: usingGift ? giftCityId : cityId,
        newAddress: usingGift
          ? {
              recipientName: `${gift.firstName} ${gift.surname}`.trim(),
              phone: gift.contact,
              line1: gift.line1,
              line2: gift.line2,
              postalCode: "",
            }
          : address,
        paymentMethod,
        customerNote: noteParts.filter(Boolean).join("\n") || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      clear();

      const { orderId, orderNumber, isGuest } = result.data;
      const orderUrl = isGuest ? `/track-order/${orderNumber}?placed=1` : `/account/orders/${orderId}?placed=1`;

      if (paymentMethod === "bank_ipg") {
        const paymentResult = await initiateBankPayment(orderId);
        if (paymentResult.ok) {
          window.location.href = paymentResult.data.redirectUrl;
          return;
        }
        // Order exists but the gateway couldn't be reached — let the
        // customer see it and retry payment from there rather than losing
        // the order entirely.
        setError(`${paymentResult.error} — your order was saved, you can retry payment from your order page.`);
        router.push(isGuest ? `/track-order/${orderNumber}` : `/account/orders/${orderId}`);
        return;
      }

      router.push(orderUrl);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Delivery Address</CardTitle>
            <div className="h-px w-10 bg-accent" aria-hidden />
            {cityLabel && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                Delivering to {cityLabel} —{" "}
                <Link href="/cart" className="text-accent hover:underline">
                  change
                </Link>
              </p>
            )}
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="recipientName">Full name</Label>
              <Input
                id="recipientName"
                required={!shipToDifferentAddress}
                disabled={shipToDifferentAddress}
                value={address.recipientName}
                onChange={(e) => setAddress((a) => ({ ...a, recipientName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                required={!shipToDifferentAddress}
                disabled={shipToDifferentAddress}
                value={address.phone}
                onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="postalCode">Postal code</Label>
              <Input
                id="postalCode"
                disabled={shipToDifferentAddress}
                value={address.postalCode}
                onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="line1">Address line 1</Label>
              <Input
                id="line1"
                required={!shipToDifferentAddress}
                disabled={shipToDifferentAddress}
                value={address.line1}
                onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="line2">Address line 2 (optional)</Label>
              <Input
                id="line2"
                disabled={shipToDifferentAddress}
                value={address.line2}
                onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
              />
            </div>

            <label className="sm:col-span-2 mt-1 flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 accent-accent"
                checked={shipToDifferentAddress}
                onChange={(e) => setShipToDifferentAddress(e.target.checked)}
              />
              <span>
                Shipping to a different address <span className="text-muted-foreground">(e.g. sending as a gift)</span>
              </span>
            </label>

            <div className="sm:col-span-2 rounded-md border bg-secondary/40 p-4 text-sm text-muted-foreground">
              All orders will take 4–5 working days to deliver. We don&apos;t do deliveries on weekends.
            </div>
            <label className="sm:col-span-2 flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                required
                className="mt-0.5 accent-accent"
                checked={acceptedDeliveryPolicy}
                onChange={(e) => setAcceptedDeliveryPolicy(e.target.checked)}
              />
              <span>Read and Accept</span>
            </label>
          </CardContent>
        </Card>

        {shipToDifferentAddress && (
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Recipient Details</CardTitle>
              <div className="h-px w-10 bg-accent" aria-hidden />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="giftFirstName">First name</Label>
                <Input
                  id="giftFirstName"
                  required
                  value={gift.firstName}
                  onChange={(e) => setGift((g) => ({ ...g, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="giftSurname">Surname</Label>
                <Input
                  id="giftSurname"
                  required
                  value={gift.surname}
                  onChange={(e) => setGift((g) => ({ ...g, surname: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="giftLine1">Address</Label>
                <Input
                  id="giftLine1"
                  required
                  value={gift.line1}
                  onChange={(e) => setGift((g) => ({ ...g, line1: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="giftDistrict">District</Label>
                <select
                  id="giftDistrict"
                  required
                  className={selectClass}
                  value={giftDistrictId}
                  onChange={(e) => {
                    setGiftDistrictId(e.target.value);
                    setGiftCityId("");
                  }}
                >
                  <option value="">Select district</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="giftCity">City</Label>
                <select
                  id="giftCity"
                  required
                  disabled={!giftDistrict}
                  className={selectClass}
                  value={giftCityId}
                  onChange={(e) => setGiftCityId(e.target.value)}
                >
                  <option value="">Select city</option>
                  {giftDistrict?.cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="giftContact">Contact number</Label>
                <Input
                  id="giftContact"
                  required
                  value={gift.contact}
                  onChange={(e) => setGift((g) => ({ ...g, contact: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="giftEmail">Email</Label>
                <Input
                  id="giftEmail"
                  type="email"
                  required
                  value={gift.email}
                  onChange={(e) => setGift((g) => ({ ...g, email: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="giftNote">Special instructions (optional)</Label>
                <textarea
                  id="giftNote"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={gift.specialInstructions}
                  onChange={(e) => setGift((g) => ({ ...g, specialInstructions: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <div className="h-px w-10 bg-accent" aria-hidden />
          </CardHeader>
          <CardContent className="space-y-3">
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md border p-4 transition-colors",
                paymentMethod === "cod" ? "border-accent bg-accent/5" : "hover:border-input",
              )}
            >
              <input
                type="radio"
                name="paymentMethod"
                className="accent-accent"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
              />
              <div>
                <p className="font-medium">Cash on Delivery</p>
                <p className="text-sm text-muted-foreground">Pay when your order arrives</p>
              </div>
            </label>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md border p-4 transition-colors",
                paymentMethod === "bank_ipg" ? "border-accent bg-accent/5" : "hover:border-input",
              )}
            >
              <input
                type="radio"
                name="paymentMethod"
                className="accent-accent"
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
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md border p-4 transition-colors",
                paymentMethod === "bank_transfer" ? "border-accent bg-accent/5" : "hover:border-input",
              )}
            >
              <input
                type="radio"
                name="paymentMethod"
                className="accent-accent"
                checked={paymentMethod === "bank_transfer"}
                onChange={() => setPaymentMethod("bank_transfer")}
              />
              <div>
                <p className="font-medium">Direct Bank Transfer</p>
                <p className="text-sm text-muted-foreground">
                  Transfer manually to our bank account, then send the payment slip
                </p>
              </div>
            </label>

            {paymentMethod === "bank_transfer" && (
              <div className="rounded-md border bg-secondary/40 p-4 text-sm">
                <p className="text-muted-foreground">
                  Make your payment directly into our bank account, using your Order Number as the payment
                  reference. Your order won&apos;t be shipped until the funds clear in our account.
                </p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground">Account name</dt>
                  <dd>Sooriya Publishers (Pvt) Ltd.</dd>
                  <dt className="text-muted-foreground">Account number</dt>
                  <dd>012210007960</dd>
                  <dt className="text-muted-foreground">Bank</dt>
                  <dd>Sampath Bank — Rajagiriya</dd>
                </dl>
                <p className="mt-3 text-muted-foreground">
                  After making your deposit, please send the payment slip via WhatsApp or email with your name and
                  order number.
                  <br />
                  WhatsApp: 077 408 9433
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="h-fit rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="font-heading text-xl">Order Summary</h2>
        <div className="mt-3 h-px w-10 bg-accent" aria-hidden />
        <div className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{effectiveShippingRate != null ? formatCurrency(effectiveShippingRate) : "—"}</span>
          </div>
          <div className="flex items-baseline justify-between border-t pt-3">
            <span className="font-heading text-base">Total</span>
            <span className="font-heading text-xl text-accent">
              {formatCurrency(subtotal + (effectiveShippingRate ?? 0))}
            </span>
          </div>
        </div>
        {error && (
          <div className="mt-4">
            <FormAlert>{error}</FormAlert>
          </div>
        )}
        <Button type="submit" variant="accent" size="lg" className="mt-6 w-full" disabled={isPending || !canSubmit}>
          {isPending ? "Placing order..." : "Place Order"}
        </Button>
      </div>
    </form>
  );
}
