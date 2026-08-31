import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments/registry";

/**
 * The actual endpoint Sampath's Paycorp IPG posts the customer's browser
 * back to after checkout — not a signed server-to-server webhook, Paycorp
 * has none. This POST body (`clientRef` + `reqid`, form-encoded) is
 * unsigned and untrusted on its own; it's only a trigger to look up the
 * transaction and make the real, trusted PAYMENT_COMPLETE call ourselves
 * (bankIpgProvider.verifyReturn), whose result is what actually confirms
 * or fails the order. Uses the service-role client because there is no
 * authenticated user in this request — Paycorp is a plain HTTP client, not
 * a logged-in customer's browser session.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const reqid = form?.get("reqid");

  if (typeof reqid !== "string" || !reqid) {
    return NextResponse.json({ error: "Missing reqid" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: transaction } = await supabase
    .from("payment_transactions")
    .select("id, order_id")
    .eq("provider_reference", reqid)
    .eq("provider_id", "bank_ipg")
    .maybeSingle();

  if (!transaction) {
    return NextResponse.json({ error: "Unknown transaction" }, { status: 404 });
  }

  const provider = getPaymentProvider("bank_ipg");
  let result;
  try {
    result = await provider.verifyReturn!(reqid);
  } catch (err) {
    console.error("Bank IPG verifyReturn failed:", err);
    return NextResponse.json({ error: "Could not verify payment" }, { status: 502 });
  }

  await supabase
    .from("payment_transactions")
    .update({
      status: result.success ? "paid" : "failed",
      raw_response: JSON.parse(JSON.stringify(result.rawResponse ?? {})),
    })
    .eq("id", transaction.id);

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, customer_id")
    .eq("id", transaction.order_id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (result.success) {
    if (order.status === "pending_payment") {
      const { data: items } = await supabase.from("order_items").select("book_id, quantity").eq("order_id", order.id);
      for (const item of items ?? []) {
        if (!item.book_id) continue;
        await supabase.rpc("commit_reserved_stock", { p_book_id: item.book_id, p_quantity: item.quantity, p_order_id: order.id });
      }
      await supabase.from("orders").update({ status: "confirmed", payment_status: "paid" }).eq("id", order.id);
      await supabase
        .from("order_status_history")
        .insert({ order_id: order.id, status: "confirmed", note: "Payment confirmed via Bank IPG" });
    }
  } else {
    await supabase.from("orders").update({ payment_status: "failed", status: "failed" }).eq("id", order.id);
  }

  // Guests have no /account/orders to redirect to — send them to the same
  // token-scoped tracking page used right after guest checkout (see
  // src/lib/orders/actions.ts).
  const destination = order.customer_id
    ? `/account/orders/${order.id}?placed=1`
    : `/track-order/${order.order_number}?placed=1`;

  return NextResponse.redirect(new URL(destination, request.url), { status: 303 });
}
