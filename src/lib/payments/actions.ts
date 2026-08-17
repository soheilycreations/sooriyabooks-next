"use server";

import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "./registry";
import type { ActionResult } from "@/lib/auth/actions";

/** Starts the Bank IPG hosted-checkout flow for an order the customer owns. */
export async function initiateBankPayment(orderId: string): Promise<ActionResult<{ redirectUrl: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, grand_total, customer_id, payment_method")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.customer_id !== user.id) {
    return { ok: false, error: "Order not found" };
  }
  if (order.payment_method !== "bank_ipg") {
    return { ok: false, error: "This order is not set up for Bank IPG payment" };
  }

  try {
    const provider = getPaymentProvider("bank_ipg");
    const intent = await provider.createIntent({
      orderId: order.id,
      orderNumber: order.order_number,
      amount: Number(order.grand_total),
      customerEmail: user.email,
    });

    await supabase.from("payment_transactions").insert({
      order_id: order.id,
      provider_id: "bank_ipg",
      provider_reference: intent.providerReference,
      amount: Number(order.grand_total),
      status: "pending",
    });

    if (!intent.redirectUrl) {
      return { ok: false, error: "Payment gateway did not return a redirect URL" };
    }
    return { ok: true, data: { redirectUrl: intent.redirectUrl } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not start payment" };
  }
}
