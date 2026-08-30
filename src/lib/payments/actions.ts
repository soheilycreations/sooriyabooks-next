"use server";

import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "./registry";
import type { ActionResult } from "@/lib/auth/actions";

/**
 * Starts the Bank IPG hosted-checkout flow for an order the caller owns —
 * either a logged-in customer's own order, or (for a guest order, whose
 * customer_id is null) the guest who just created it in this same request.
 * Reading `orders` here relies on RLS (`orders_owner_read`), which only a
 * logged-in owner passes — a guest's own just-placed order isn't readable
 * this way, so the guest branch below goes through the same
 * SECURITY DEFINER path place_guest_order() uses instead of a plain select.
 */
export async function initiateBankPayment(orderId: string): Promise<ActionResult<{ redirectUrl: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let order: { id: string; order_number: string; grand_total: number; customer_id: string | null; payment_method: string } | null =
    null;

  if (user) {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, grand_total, customer_id, payment_method")
      .eq("id", orderId)
      .maybeSingle();
    order = data;
    if (!order || order.customer_id !== user.id) {
      return { ok: false, error: "Order not found" };
    }
  } else {
    const { data } = await supabase.rpc("get_guest_order_for_payment", { p_order_id: orderId });
    order = data?.[0]
      ? {
          id: data[0].order_id,
          order_number: data[0].order_number,
          grand_total: data[0].grand_total,
          customer_id: null,
          payment_method: data[0].payment_method,
        }
      : null;
    if (!order) {
      return { ok: false, error: "Order not found" };
    }
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
      customerEmail: user?.email,
    });

    if (user) {
      await supabase.from("payment_transactions").insert({
        order_id: order.id,
        provider_id: "bank_ipg",
        provider_reference: intent.providerReference,
        amount: Number(order.grand_total),
        status: "pending",
      });
    } else {
      await supabase.rpc("record_guest_payment_transaction", {
        p_order_id: order.id,
        p_provider_reference: intent.providerReference,
        p_amount: Number(order.grand_total),
      });
    }

    if (!intent.redirectUrl) {
      return { ok: false, error: "Payment gateway did not return a redirect URL" };
    }
    return { ok: true, data: { redirectUrl: intent.redirectUrl } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not start payment" };
  }
}
