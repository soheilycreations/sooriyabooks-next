import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
    .select("id, order_number, status, payment_method, payment_status, subtotal, shipping_total, discount_total, grand_total, placed_at")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("id, title_snapshot, unit_price, quantity, line_total")
    .eq("order_id", id);

  const currentStepIndex = STATUS_STEPS.indexOf(order.status as (typeof STATUS_STEPS)[number]);

  return (
    <div>
      {placed === "1" && (
        <div className="mb-6 rounded-md border border-accent/40 bg-accent/10 p-4 text-sm">
          Thank you! Your order has been placed successfully.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl">Order {order.order_number}</h1>
        <Badge variant="secondary" className="capitalize">
          {order.status.replace(/_/g, " ")}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Placed on {formatDate(order.placed_at)}</p>

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

      <div className="mt-8 space-y-3">
        {(items ?? []).map((item) => (
          <div key={item.id} className="flex justify-between border-b py-3 text-sm">
            <span>
              {item.title_snapshot} &times; {item.quantity}
            </span>
            <span>{formatCurrency(Number(item.line_total))}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 ml-auto max-w-xs space-y-1 text-sm">
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
  );
}
