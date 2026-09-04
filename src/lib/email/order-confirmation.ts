import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { getResendClient } from "./resend";

const ACCENT = "#f1aa37";
const FOREGROUND = "#121212";
const MUTED = "#6b6b6b";
const BORDER = "#e5e0d8";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  bank_ipg: "Credit/Debit Card Payment",
  bank_transfer: "Direct Bank Transfer",
};

/**
 * Sends the order confirmation email. Called right after an order is
 * created (both the guest and authenticated checkout paths in
 * lib/orders/actions.ts) — failures here are logged and swallowed rather
 * than thrown, since the order itself already exists and succeeded; losing
 * the confirmation email is not a reason to tell the customer their order
 * failed.
 *
 * Reads via the service-role client (bypasses RLS) because a guest order
 * has no auth.uid() to satisfy the normal customer_id = auth.uid() RLS
 * policy — the same reason place_guest_order() itself runs SECURITY
 * DEFINER. Safe here because this only ever runs server-side, immediately
 * after this exact order was created in this exact request.
 */
export async function sendOrderConfirmationEmail(orderId: string) {
  const resend = getResendClient();
  if (!resend) {
    console.warn(`sendOrderConfirmationEmail: RESEND_API_KEY not configured — skipping order ${orderId}`);
    return;
  }

  const supabase = createServiceRoleClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      `order_number, contact_email, payment_method, subtotal, discount_total, shipping_total, grand_total, placed_at,
       shipping_address:shipping_address_id (
         recipient_name, line1, line2, postal_code,
         shipping_cities ( name, shipping_districts ( name ) )
       )`,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    console.error(`sendOrderConfirmationEmail: order ${orderId} not found`);
    return;
  }
  if (!order.contact_email) {
    // Orders placed before this column existed — nothing to send to.
    return;
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("title_snapshot, quantity, line_total")
    .eq("order_id", orderId);

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Sooriya Publishers <onboarding@resend.dev>",
      to: order.contact_email,
      subject: `Order confirmed — ${order.order_number}`,
      html: renderOrderConfirmationHtml(order, items ?? []),
    });
  } catch (err) {
    console.error(`sendOrderConfirmationEmail: failed to send for order ${orderId}:`, err);
  }
}

interface OrderForEmail {
  order_number: string;
  payment_method: string;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  grand_total: number;
  placed_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shipping_address: any;
}

interface ItemForEmail {
  title_snapshot: string;
  quantity: number;
  line_total: number;
}

function renderOrderConfirmationHtml(order: OrderForEmail, items: ItemForEmail[]): string {
  const address = order.shipping_address;
  const city = address?.shipping_cities;
  const district = city?.shipping_districts;

  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${BORDER};color:${FOREGROUND};font-size:14px;">
            ${escapeHtml(item.title_snapshot)} &times; ${item.quantity}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid ${BORDER};color:${FOREGROUND};font-size:14px;text-align:right;white-space:nowrap;">
            ${formatCurrency(Number(item.line_total))}
          </td>
        </tr>`,
    )
    .join("");

  const discountRow =
    Number(order.discount_total) > 0
      ? `<tr>
          <td style="padding:4px 0;color:${MUTED};font-size:13px;">Discount</td>
          <td style="padding:4px 0;color:${ACCENT};font-size:13px;text-align:right;">-${formatCurrency(Number(order.discount_total))}</td>
        </tr>`
      : "";

  const paymentLabel = PAYMENT_METHOD_LABEL[order.payment_method] ?? order.payment_method;

  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f5f1;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f1;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:${FOREGROUND};padding:24px 32px;">
                <span style="color:${ACCENT};font-size:20px;font-weight:bold;letter-spacing:0.05em;">SOORIYA PUBLISHERS</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 4px;color:${MUTED};font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Order Confirmed</p>
                <h1 style="margin:0 0 20px;color:${FOREGROUND};font-size:24px;">${escapeHtml(order.order_number)}</h1>
                <p style="margin:0 0 24px;color:${FOREGROUND};font-size:14px;line-height:1.6;">
                  Thank you for your order — we're getting it ready. You'll be notified again once it ships.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${itemRows}
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                  <tr>
                    <td style="padding:4px 0;color:${MUTED};font-size:13px;">Subtotal</td>
                    <td style="padding:4px 0;color:${FOREGROUND};font-size:13px;text-align:right;">${formatCurrency(Number(order.subtotal))}</td>
                  </tr>
                  ${discountRow}
                  <tr>
                    <td style="padding:4px 0;color:${MUTED};font-size:13px;">Courier Charge</td>
                    <td style="padding:4px 0;color:${FOREGROUND};font-size:13px;text-align:right;">${formatCurrency(Number(order.shipping_total))}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0 0;border-top:1px solid ${BORDER};color:${FOREGROUND};font-size:16px;font-weight:bold;">Total</td>
                    <td style="padding:10px 0 0;border-top:1px solid ${BORDER};color:${ACCENT};font-size:16px;font-weight:bold;text-align:right;">${formatCurrency(Number(order.grand_total))}</td>
                  </tr>
                </table>

                <p style="margin:24px 0 0;color:${MUTED};font-size:13px;">Payment method: ${escapeHtml(paymentLabel)}</p>

                ${
                  address
                    ? `<div style="margin-top:24px;padding:16px;background:#f7f5f1;border-radius:6px;">
                        <p style="margin:0 0 6px;color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Delivering to</p>
                        <p style="margin:0;color:${FOREGROUND};font-size:14px;font-weight:bold;">${escapeHtml(address.recipient_name)}</p>
                        <p style="margin:4px 0 0;color:${FOREGROUND};font-size:13px;line-height:1.5;">
                          ${escapeHtml(address.line1)}${address.line2 ? `, ${escapeHtml(address.line2)}` : ""}<br/>
                          ${escapeHtml(city?.name ?? "")}${district?.name ? `, ${escapeHtml(district.name)}` : ""}${address.postal_code ? ` ${escapeHtml(address.postal_code)}` : ""}
                        </p>
                      </div>`
                    : ""
                }

                <p style="margin:28px 0 0;color:${MUTED};font-size:12px;line-height:1.6;">
                  All orders take 4–5 working days to deliver. We don't do deliveries on weekends.
                  Questions? Reply to this email or WhatsApp us at 077 408 9433.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f7f5f1;padding:16px 32px;text-align:center;">
                <p style="margin:0;color:${MUTED};font-size:12px;">Sooriya Publishers &middot; sooriyabooks.lk</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
