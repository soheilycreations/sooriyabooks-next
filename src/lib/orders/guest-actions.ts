"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveCoverUrl } from "@/lib/catalog/queries";

export interface GuestOrderDetails {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  grandTotal: number;
  placedAt: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  postalCode: string | null;
  cityName: string | null;
  districtName: string | null;
  items: { title: string; quantity: number; lineTotal: number; coverUrl: string | null }[];
}

/**
 * Looks up a guest order by order number + the phone number given at
 * checkout (digits-only match, see track_guest_order() in
 * supabase/migrations/0019_guest_checkout.sql). A guest has no account, so
 * this — not /account/orders — is the only way they can check their order
 * again after leaving the confirmation page.
 */
export async function trackGuestOrder(
  orderNumber: string,
  phone: string,
): Promise<{ ok: true; data: GuestOrderDetails } | { ok: false; error: string }> {
  const trimmedNumber = orderNumber.trim();
  const trimmedPhone = phone.trim();
  if (!trimmedNumber || !trimmedPhone) {
    return { ok: false, error: "Enter your order number and phone number" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("track_guest_order", {
    p_order_number: trimmedNumber,
    p_phone: trimmedPhone,
  });

  if (error) {
    console.error("trackGuestOrder: track_guest_order failed:", error.message);
    return { ok: false, error: "Could not look up this order. Please try again." };
  }

  const row = data?.[0];
  if (!row) {
    return { ok: false, error: "No matching order found. Check your order number and the phone number you used at checkout." };
  }

  return {
    ok: true,
    data: {
      orderId: row.order_id,
      orderNumber: row.order_number,
      status: row.status,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      subtotal: Number(row.subtotal),
      discountTotal: Number(row.discount_total),
      shippingTotal: Number(row.shipping_total),
      grandTotal: Number(row.grand_total),
      placedAt: row.placed_at,
      recipientName: row.recipient_name,
      phone: row.phone,
      line1: row.line1,
      line2: row.line2,
      postalCode: row.postal_code,
      cityName: row.city_name,
      districtName: row.district_name,
      items: ((row.items ?? []) as { title: string; quantity: number; lineTotal: number; coverPath: string | null }[]).map(
        (item) => ({
          title: item.title,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
          coverUrl: resolveCoverUrl(item.coverPath),
        }),
      ),
    },
  };
}
