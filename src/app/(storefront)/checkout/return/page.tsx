import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendPaymentFailedEmail } from "@/lib/email/order-confirmation";
import { Button } from "@/components/ui/button";
import { RetryPaymentButton } from "./retry-payment-button";

/**
 * The `cancelUrl` sent to Sampath's Paycorp IPG — reached when the
 * customer's card is declined before Paycorp ever completes the
 * transaction, or they abandon the hosted checkout page themselves. A
 * *completed* payment never lands here: Paycorp POSTs the browser
 * straight to /api/payments/bank-ipg/return instead, which is what
 * verifies and confirms (or fails) the order in that case.
 *
 * This used to just silently redirect to the order page with no
 * explanation and no cleanup — the order sat in "pending_payment"
 * forever, and its reserved stock was never given back (customers saw
 * this as "the page just bounces back and nothing happens"). Now it
 * explicitly fails the order and releases the reservation, then shows
 * what actually happened with a way to try again.
 */
export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  if (!orderId) redirect("/account/orders");

  // Service-role, not the normal cookie client — RLS only allows an order's
  // owner (or staff) to read it, and a guest order has no owner to match
  // against (customer_id is null). The order id itself is the only thing
  // that scopes this lookup, same as the rest of the guest-checkout flow.
  const supabase = createServiceRoleClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_method, customer_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) redirect("/account/orders");

  if (order.status === "pending_payment" && order.payment_method === "bank_ipg") {
    const { data: items } = await supabase.from("order_items").select("book_id, quantity").eq("order_id", order.id);
    for (const item of items ?? []) {
      if (!item.book_id) continue;
      await supabase.rpc("release_reserved_stock_system", {
        p_book_id: item.book_id,
        p_quantity: item.quantity,
        p_order_id: order.id,
      });
    }
    await supabase.from("orders").update({ status: "failed", payment_status: "failed" }).eq("id", order.id);
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      status: "failed",
      note: "Payment was not completed at the gateway (cancelled or declined before checkout finished)",
    });
    await sendPaymentFailedEmail(order.id);
  }

  const orderUrl = order.customer_id ? `/account/orders/${order.id}` : `/track-order/${order.order_number}`;

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="mt-5 font-heading text-2xl">Payment Not Completed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your card was not charged. Order <span className="font-medium text-foreground">{order.order_number}</span> is
          saved — you can try paying again, or choose a different payment method from your order page.
        </p>

        <div className="mt-6 space-y-3">
          <RetryPaymentButton orderId={order.id} />
          <Button variant="outline" size="lg" className="w-full" asChild>
            <Link href={orderUrl}>View Order</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
