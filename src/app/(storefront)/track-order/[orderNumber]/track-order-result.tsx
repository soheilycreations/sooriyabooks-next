"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FormAlert } from "@/components/shared/form-alert";
import { OrderPackAnimation } from "@/components/storefront/order-pack-animation";
import { BankTransferNotice } from "@/components/storefront/bank-transfer-notice";
import { formatCurrency, formatDate } from "@/lib/utils";
import { trackGuestOrder, type GuestOrderDetails } from "@/lib/orders/guest-actions";

const STATUS_STEPS = ["confirmed", "packed", "shipped", "delivered"] as const;

export function TrackOrderResult({ orderNumber, justPlaced }: { orderNumber: string; justPlaced: boolean }) {
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<GuestOrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await trackGuestOrder(orderNumber, phone);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOrder(result.data);
    });
  }

  if (order) {
    const currentStepIndex = STATUS_STEPS.indexOf(order.status as (typeof STATUS_STEPS)[number]);
    return (
      <div>
        {justPlaced && (
          <div className="mb-8 flex flex-col items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 py-10 text-center">
            <OrderPackAnimation
              orderNumber={order.orderNumber}
              covers={order.items
                .filter((i): i is typeof i & { coverUrl: string } => i.coverUrl !== null)
                .map((i) => ({ url: i.coverUrl, title: i.title }))}
            />
            <div>
              <p className="font-heading text-2xl">Order Placed</p>
              <p className="mt-1 text-muted-foreground">
                Thank you — order <span className="font-medium text-foreground">{order.orderNumber}</span> has been
                placed successfully.
              </p>
            </div>
            <p className="font-heading text-xl text-accent">{formatCurrency(order.grandTotal)}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl leading-tight md:text-3xl">Order {order.orderNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Placed on {formatDate(order.placedAt)}</p>
          </div>
          <Badge variant="secondary" className="capitalize">
            {order.status.replace(/_/g, " ")}
          </Badge>
        </div>

        {currentStepIndex >= 0 && (
          <div className="mt-8 flex items-center gap-2">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex flex-1 items-center gap-2">
                <div className={`h-2 flex-1 rounded-full ${i <= currentStepIndex ? "bg-accent" : "bg-muted"}`} />
                <span className="text-xs capitalize text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-heading text-lg">Items</h2>
            <div className="mt-3 space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between border-b py-3 text-sm">
                  <span>
                    {item.title} &times; {item.quantity}
                  </span>
                  <span>{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Courier Charge</span>
                <span>{formatCurrency(order.shippingTotal)}</span>
              </div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-{formatCurrency(order.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 font-medium">
                <span>Total</span>
                <span>{formatCurrency(order.grandTotal)}</span>
              </div>
              <p className="pt-2 text-xs capitalize text-muted-foreground">
                Payment: {order.paymentMethod.replace(/_/g, " ")} ({order.paymentStatus})
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-heading text-lg">Delivery Address</h2>
            <div className="mt-3 rounded-lg border p-4 text-sm">
              <p className="font-medium">{order.recipientName}</p>
              <p className="mt-1 text-muted-foreground">{order.phone}</p>
              <p className="mt-2 text-muted-foreground">
                {order.line1}
                {order.line2 && <>, {order.line2}</>}
              </p>
              <p className="text-muted-foreground">
                {order.cityName}
                {order.districtName && `, ${order.districtName}`}
                {order.postalCode && ` ${order.postalCode}`}
              </p>
            </div>
          </div>
        </div>

        {order.paymentMethod === "bank_transfer" && order.paymentStatus === "pending" && (
          <BankTransferNotice orderNumber={order.orderNumber} />
        )}

        <div className="mt-10 border-t pt-8">
          <Button variant="outline" asChild>
            <Link href="/search">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {justPlaced && (
        <div className="mb-8 flex flex-col items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-accent" />
          <div>
            <p className="font-heading text-2xl">Order Placed</p>
            <p className="mt-1 text-muted-foreground">
              Thank you — order <span className="font-medium text-foreground">{orderNumber}</span> has been placed
              successfully.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 text-center">
        <Package className="h-8 w-8 text-muted-foreground" />
        <h1 className="font-heading text-2xl leading-tight">Order {orderNumber}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Enter the phone number you used at checkout to view this order.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-sm space-y-4">
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        <Button type="submit" variant="accent" className="w-full" disabled={isPending}>
          {isPending ? "Checking..." : "View Order"}
        </Button>
      </form>
    </div>
  );
}
