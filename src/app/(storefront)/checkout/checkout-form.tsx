"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Gift, Banknote, CreditCard, Landmark, BadgePercent } from "lucide-react";
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
import { loadLastDelivery, saveLastDelivery } from "@/lib/shipping/city-storage";
import { loadLastAddress, saveLastAddress } from "@/lib/checkout/address-storage";
import type { DistrictWithCities } from "@/lib/shipping/queries";

const selectClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, subtotal, totalDiscount, totalWeightGrams, clear } = useCart();
  const cityId = searchParams.get("cityId") ?? "";

  const [districts, setDistricts] = useState<DistrictWithCities[]>([]);
  const [cityLabel, setCityLabel] = useState<string | null>(null);
  const [shippingRate, setShippingRate] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank_ipg" | "bank_transfer">("cod");
  const [address, setAddress] = useState({
    recipientName: "",
    phone: "",
    email: "",
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
    specialInstructions: "",
  });
  const [acceptedDeliveryPolicy, setAcceptedDeliveryPolicy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fallback city picker for landing on /checkout directly with no
  // ?cityId= (e.g. a bookmarked/shared link) — previously a dead end
  // ("go back to your cart"); now the same district/city pick just
  // happens right here instead.
  const [pickerDistrictId, setPickerDistrictId] = useState("");
  const [pickerCityId, setPickerCityId] = useState("");
  const [autoRedirectChecked, setAutoRedirectChecked] = useState(false);

  useEffect(() => {
    getShippingOptionsAction().then(setDistricts);
  }, []);

  // Prefill with whatever the shopper last successfully checked out with,
  // so returning customers don't retype their name/phone/email/address
  // every single time.
  useEffect(() => {
    const saved = loadLastAddress();
    if (saved) setAddress(saved);
  }, []);

  // Landed on /checkout with no ?cityId= — before asking again, check
  // whether we already know where they last delivered to and skip straight
  // there instead of making them re-pick it every time.
  useEffect(() => {
    if (cityId || districts.length === 0 || autoRedirectChecked) return;
    const saved = loadLastDelivery();
    if (saved) {
      const district = districts.find((d) => d.id === saved.districtId);
      const city = district?.cities.find((c) => c.id === saved.cityId);
      if (city) {
        router.replace(`/checkout?cityId=${saved.cityId}`);
        return;
      }
    }
    setAutoRedirectChecked(true);
  }, [cityId, districts, autoRedirectChecked, router]);

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
    // Still checking localStorage / redirecting to a remembered city —
    // render nothing rather than flashing the picker first.
    if (!autoRedirectChecked) return null;

    const pickerDistrict = districts.find((d) => d.id === pickerDistrictId);
    return (
      <div className="relative mx-auto max-w-sm overflow-hidden rounded-lg border bg-card p-8">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-accent/10"
          viewBox="0 0 400 400"
          fill="none"
          aria-hidden
        >
          <path
            d="M20 350 C 90 270, 130 300, 190 230 S 290 130, 300 90 S 340 40, 385 20"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="8 10"
            strokeLinecap="round"
          />
          <circle cx="20" cy="350" r="7" fill="currentColor" />
          <circle cx="190" cy="230" r="7" fill="currentColor" />
          <circle cx="385" cy="20" r="7" fill="currentColor" />
        </svg>
        <MapPin className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 text-accent/[0.07]" aria-hidden />

        <div className="relative">
          <p className="text-center text-muted-foreground">Select where you&apos;re delivering to.</p>
          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="pickerDistrict">District</Label>
              <select
                id="pickerDistrict"
                className={selectClass}
                value={pickerDistrictId}
                onChange={(e) => {
                  setPickerDistrictId(e.target.value);
                  setPickerCityId("");
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
              <Label htmlFor="pickerCity">City</Label>
              <select
                id="pickerCity"
                disabled={!pickerDistrict}
                className={selectClass}
                value={pickerCityId}
                onChange={(e) => setPickerCityId(e.target.value)}
              >
                <option value="">Select city</option>
                {pickerDistrict?.cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="accent"
              className="w-full"
              disabled={!pickerCityId}
              onClick={() => {
                saveLastDelivery(pickerDistrictId, pickerCityId);
                router.push(`/checkout?cityId=${pickerCityId}`);
              }}
            >
              Continue
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/cart">Go back to your cart</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const giftDistrict = districts.find((d) => d.id === giftDistrictId);
  const effectiveShippingRate = shipToDifferentAddress ? giftShippingRate : shippingRate;
  const giftFieldsReady =
    !shipToDifferentAddress ||
    Boolean(giftCityId && giftShippingRate != null && gift.firstName && gift.surname && gift.line1 && gift.contact);
  const canSubmit = acceptedDeliveryPolicy && Boolean(address.email) && giftFieldsReady;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const usingGift = shipToDifferentAddress;

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
          : { recipientName: address.recipientName, phone: address.phone, line1: address.line1, line2: address.line2, postalCode: address.postalCode },
        paymentMethod,
        contactEmail: address.email,
        customerNote: usingGift && gift.specialInstructions ? `Note: ${gift.specialInstructions}` : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Only when NOT sending as a gift — in gift mode the main address
      // fields (name/phone/line1/etc.) are left blank on purpose, so saving
      // here would overwrite a good remembered address with empty ones.
      if (!usingGift) saveLastAddress(address);
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
    <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-3 lg:items-start">
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
              {/* Not disabled by "ship to a different address" — this is the
                  buyer's own contact, independent of wherever the package
                  ends up going. */}
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={address.email}
                onChange={(e) => setAddress((a) => ({ ...a, email: e.target.value }))}
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
              <span className="inline-flex items-center gap-1.5">
                <Gift className="h-4 w-4 text-accent" aria-hidden />
                Shipping to a different address <span className="text-muted-foreground">(e.g. sending as a gift)</span>
              </span>
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
              <Banknote className="h-6 w-6 shrink-0 text-accent" aria-hidden />
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
              <CreditCard className="h-6 w-6 shrink-0 text-accent" aria-hidden />
              <div>
                <p className="font-medium">Credit/Debit Card Payment</p>
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
              <Landmark className="h-6 w-6 shrink-0 text-accent" aria-hidden />
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

      <div className="h-fit rounded-lg border bg-card p-6 shadow-sm lg:sticky lg:top-24">
        <h2 className="font-heading text-xl">Order Summary</h2>
        <div className="mt-3 h-px w-10 bg-accent" aria-hidden />

        <ul className="mt-5 max-h-72 space-y-3 overflow-y-auto pr-1">
          {items.map((item) => (
            <li key={item.bookId} className="flex gap-3">
              <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm bg-muted">
                {item.coverUrl && (
                  <Image src={item.coverUrl} alt={item.title} fill sizes="48px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="line-clamp-2 leading-snug">{item.title}</p>
                <p className="mt-0.5 text-muted-foreground">Qty {item.quantity}</p>
              </div>
              <span className="shrink-0 text-sm">{formatCurrency(item.unitPrice * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 space-y-2 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-accent">-{formatCurrency(totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Courier Charge</span>
            <span>{effectiveShippingRate != null ? formatCurrency(effectiveShippingRate) : "—"}</span>
          </div>
          <div className="flex items-baseline justify-between border-t pt-3">
            <span className="font-heading text-base">Total</span>
            <span className="font-heading text-xl text-accent">
              {formatCurrency(subtotal + (effectiveShippingRate ?? 0))}
            </span>
          </div>
        </div>

        {totalDiscount > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent">
            <BadgePercent className="h-4 w-4 shrink-0" aria-hidden />
            You&apos;re saving {formatCurrency(totalDiscount)} on this order!
          </div>
        )}

        <div className="mt-5 rounded-md border bg-secondary/40 p-4 text-sm text-muted-foreground">
          All orders will take 4–5 working days to deliver. We don&apos;t do deliveries on weekends.
        </div>
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            required
            className="mt-0.5 accent-accent"
            checked={acceptedDeliveryPolicy}
            onChange={(e) => setAcceptedDeliveryPolicy(e.target.checked)}
          />
          <span>Read and Accept</span>
        </label>

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
