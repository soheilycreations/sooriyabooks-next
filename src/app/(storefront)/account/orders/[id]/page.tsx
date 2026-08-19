import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_STEPS = ["confirmed", "packed", "shipped", "delivered"] as const;

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { id } = await params;
  const { placed } = await searchParams;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, payment_method, payment_status, subtotal, shipping_total, discount_total, grand_total, placed_at,
       shipping_address:shipping_address_id (
         recipient_name, phone, line1, line2, postal_code,
         shipping_cities ( name, shipping_districts ( name ) )
       )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("id, title_snapshot, unit_price, quantity, line_total")
    .eq("order_id", id);

  const currentStepIndex = STATUS_STEPS.indexOf(order.status as (typeof STATUS_STEPS)[number]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const address = order.shipping_address as any;
  const city = address?.shipping_cities;
  const district = city?.shipping_districts;

  return (
    <div>
      {placed === "1" && (
        <div className="mb-8 flex flex-col items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-accent" />
          <div>
            <p className="font-heading text-2xl">Order Confirmed</p>
            <p className="mt-1 text-muted-foreground">
              Thank you — order <span className="font-medium text-foreground">{order.order_number}</span> has
              been placed successfully.
            </p>
          </div>
          <p className="font-heading text-xl text-accent">{formatCurrency(Number(order.grand_total))}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl leading-tight">Order {order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Placed on {formatDate(order.placed_at)}</p>
        </div>
        <Badge variant="secondary" className="capitalize">
          {order.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {currentStepIndex >= 0 && (
        <div className="mt-8 flex items-center gap-2">
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className="flex flex-1 items-center gap-2">
              <div
                className={`h-2 flex-1 rounded-full ${i <= currentStepIndex ? "bg-accent" : "bg-muted"}`}
              />
              <span className="text-xs capitalize text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="font-heading text-lg">Items</h2>
          <div className="mt-3 space-y-3">
            {(items ?? []).map((item) => (
              <div key={item.id} className="flex justify-between border-b py-3 text-sm">
                <span>
                  {item.title_snapshot} &times; {item.quantity}
                </span>
                <span>{formatCurrency(Number(item.line_total))}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatCurrency(Number(order.shipping_total))}</span>
            </div>
            {Number(order.discount_total) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatCurrency(Number(order.discount_total))}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 font-medium">
              <span>Total</span>
              <span>{formatCurrency(Number(order.grand_total))}</span>
            </div>
            <p className="pt-2 text-xs capitalize text-muted-foreground">
              Payment: {order.payment_method.replace(/_/g, " ")} ({order.payment_status})
            </p>
          </div>
        </div>

        {address && (
          <div>
            <h2 className="font-heading text-lg">Delivery Address</h2>
            <div className="mt-3 rounded-lg border p-4 text-sm">
              <p className="font-medium">{address.recipient_name}</p>
              <p className="mt-1 text-muted-foreground">{address.phone}</p>
              <p className="mt-2 text-muted-foreground">
                {address.line1}
                {address.line2 && <>, {address.line2}</>}
              </p>
              <p className="text-muted-foreground">
                {city?.name}
                {district?.name && `, ${district.name}`}
                {address.postal_code && ` ${address.postal_code}`}
              </p>
            </div>
          </div>
        )}
      </div>

      {placed === "1" && (
        <div className="mt-10 flex flex-wrap gap-3 border-t pt-8">
          <Button variant="accent" asChild>
            <Link href="/search">Continue Shopping</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/account/orders">View All Orders</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
