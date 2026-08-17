import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments/registry";

/**
 * Server-to-server callback from the Bank IPG. Uses the service-role client
 * (bypasses RLS by design — there is no authenticated user in this
 * request, only a signed payload from a trusted server) to update the
 * order and commit reserved stock once payment is confirmed. Never trusts
 * the payload without first verifying its signature in
 * bankIpgProvider.handleWebhook().
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-ipg-signature"); // TODO: confirm the real header name from the bank's docs

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const provider = getPaymentProvider("bank_ipg");
  let result;
  try {
    result = await provider.handleWebhook(payload, signature);
  } catch (err) {
    // Log the real error server-side for debugging, but never echo internal
    // error details (config state, stack traces) back in the response to
    // an unauthenticated caller.
    console.error("Bank IPG webhook processing failed:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 });
  }

  if (!result.providerReference) {
    return NextResponse.json({ error: "Missing provider reference" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: transaction } = await supabase
    .from("payment_transactions")
    .select("id, order_id")
    .eq("provider_reference", result.providerReference)
    .eq("provider_id", "bank_ipg")
    .maybeSingle();

  if (!transaction) {
    return NextResponse.json({ error: "Unknown transaction" }, { status: 404 });
  }

  await supabase
    .from("payment_transactions")
    .update({
      status: result.success ? "paid" : "failed",
      raw_response: JSON.parse(JSON.stringify(result.rawResponse ?? {})),
    })
    .eq("id", transaction.id);

  if (!result.success) {
    await supabase.from("orders").update({ payment_status: "failed", status: "failed" }).eq("id", transaction.order_id);
    return NextResponse.json({ ok: true });
  }

  const { data: order } = await supabase.from("orders").select("id, status").eq("id", transaction.order_id).maybeSingle();
  if (order && order.status === "pending_payment") {
    const { data: items } = await supabase.from("order_items").select("book_id, quantity").eq("order_id", order.id);
    for (const item of items ?? []) {
      if (!item.book_id) continue;
      await supabase.rpc("commit_reserved_stock", { p_book_id: item.book_id, p_quantity: item.quantity, p_order_id: order.id });
    }
    await supabase.from("orders").update({ status: "confirmed", payment_status: "paid" }).eq("id", order.id);
    await supabase.from("order_status_history").insert({ order_id: order.id, status: "confirmed", note: "Payment confirmed via Bank IPG" });
  }

  return NextResponse.json({ ok: true });
}
