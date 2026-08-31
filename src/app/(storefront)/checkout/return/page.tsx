import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * The `cancelUrl` sent to Sampath's Paycorp IPG — reached only if the
 * customer abandons the hosted checkout page rather than completing it.
 * A completed payment never lands here: Paycorp POSTs the browser
 * straight to /api/payments/bank-ipg/return instead, which is what
 * actually verifies and confirms the order. This page just sends an
 * abandoned customer somewhere sensible to see the order is still
 * pending — a guest has no /account/orders to bounce to, so their own
 * order/phone-verified tracking page is used instead.
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
  const { data: order } = await supabase.from("orders").select("order_number, customer_id").eq("id", orderId).maybeSingle();

  if (!order) redirect("/account/orders");
  redirect(order.customer_id ? `/account/orders/${orderId}` : `/track-order/${order.order_number}`);
}
