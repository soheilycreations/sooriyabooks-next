import { redirect } from "next/navigation";

/**
 * The bank redirects the customer's browser here after they complete (or
 * abandon) the hosted checkout page. This is a UX convenience only — the
 * actual payment confirmation is the signed server-to-server webhook
 * (src/app/api/webhooks/bank-ipg), which is the source of truth for order
 * status. This page just sends the customer to their order, where the
 * real (possibly still-pending, briefly) status is shown.
 */
export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  redirect(orderId ? `/account/orders/${orderId}` : "/account/orders");
}
