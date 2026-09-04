import "server-only";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { resolveCoverUrl } from "@/lib/catalog/queries";
import { getResendClient } from "./resend";

const ACCENT = "#f1aa37";
const FOREGROUND = "#121212";
const MUTED = "#6b6b6b";
const BORDER = "#e5e0d8";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sooriyabooks.lk";
const LOGO_URL = `${SITE_URL}/brand/sooriya-logo.png`;

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

  const { data: itemRows } = await supabase
    .from("order_items")
    .select(
      `title_snapshot, quantity, line_total,
       books ( book_images ( is_primary, sort_order, media_assets ( storage_path ) ) )`,
    )
    .eq("order_id", orderId);

  const items: ItemForEmail[] = (itemRows ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const images = (row.books as any)?.book_images ?? [];
    const primary = [...images].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
    )[0];
    return {
      title: row.title_snapshot,
      quantity: row.quantity,
      lineTotal: Number(row.line_total),
      coverUrl: resolveCoverUrl(primary?.media_assets?.storage_path ?? null),
    };
  });

  try {
    const pdf = renderOrderSummaryPdf(order, items);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Sooriya Publishers <onboarding@resend.dev>",
      to: order.contact_email,
      subject: `Order confirmed — ${order.order_number}`,
      html: renderOrderConfirmationHtml(order, items),
      attachments: [{ filename: `${order.order_number}.pdf`, content: pdf }],
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
  title: string;
  quantity: number;
  lineTotal: number;
  coverUrl: string | null;
}

function renderOrderConfirmationHtml(order: OrderForEmail, items: ItemForEmail[]): string {
  const address = order.shipping_address;
  const city = address?.shipping_cities;
  const district = city?.shipping_districts;

  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${BORDER};width:52px;">
            ${
              item.coverUrl
                ? `<img src="${item.coverUrl}" width="40" height="54" alt="" style="display:block;width:40px;height:54px;object-fit:cover;border-radius:3px;" />`
                : `<div style="width:40px;height:54px;background:${BORDER};border-radius:3px;"></div>`
            }
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};color:${FOREGROUND};font-size:14px;">
            ${escapeHtml(item.title)} &times; ${item.quantity}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid ${BORDER};color:${FOREGROUND};font-size:14px;text-align:right;white-space:nowrap;vertical-align:top;">
            ${formatCurrency(item.lineTotal)}
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
              <td style="background:${FOREGROUND};padding:20px 32px;">
                <img src="${LOGO_URL}" alt="Sooriya Publishers" height="32" style="display:block;height:32px;width:auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 4px;color:${MUTED};font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Order Confirmed</p>
                <h1 style="margin:0 0 20px;color:${FOREGROUND};font-size:24px;">${escapeHtml(order.order_number)}</h1>
                <p style="margin:0 0 24px;color:${FOREGROUND};font-size:14px;line-height:1.6;">
                  Thank you for your order — we're getting it ready. You'll be notified again once it ships.
                  A copy of your order summary is attached to this email as a PDF.
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

/** Same order summary as the email body, as a one-page PDF attachment —
 *  useful for the customer to save, print, or forward without needing to
 *  keep the email itself around. */
function renderOrderSummaryPdf(order: OrderForEmail, items: ItemForEmail[]): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const address = order.shipping_address;
  const city = address?.shipping_cities;
  const district = city?.shipping_districts;

  doc.setFontSize(18);
  doc.text("Sooriya Publishers", 40, 50);
  doc.setFontSize(11);
  doc.setTextColor(107, 107, 107);
  doc.text("Order Summary", 40, 68);

  doc.setTextColor(18, 18, 18);
  doc.setFontSize(14);
  doc.text(order.order_number, 40, 96);
  doc.setFontSize(10);
  doc.setTextColor(107, 107, 107);
  doc.text(new Date(order.placed_at).toLocaleDateString("en-LK", { dateStyle: "long" }), 40, 112);

  autoTable(doc, {
    startY: 130,
    head: [["Item", "Qty", "Line Total"]],
    body: items.map((item) => [item.title, String(item.quantity), formatCurrency(item.lineTotal)]),
    headStyles: { fillColor: [18, 18, 18], textColor: [241, 170, 55] },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    margin: { left: 40, right: 40 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let y = (doc as any).lastAutoTable.finalY + 24;

  const totalsRows: [string, string][] = [["Subtotal", formatCurrency(Number(order.subtotal))]];
  if (Number(order.discount_total) > 0) {
    totalsRows.push(["Discount", `-${formatCurrency(Number(order.discount_total))}`]);
  }
  totalsRows.push(["Courier Charge", formatCurrency(Number(order.shipping_total))]);

  doc.setFontSize(10);
  for (const [label, value] of totalsRows) {
    doc.setTextColor(107, 107, 107);
    doc.text(label, 400, y);
    doc.setTextColor(18, 18, 18);
    doc.text(value, 555, y, { align: "right" });
    y += 16;
  }
  doc.setDrawColor(229, 224, 216);
  doc.line(400, y, 555, y);
  y += 18;
  doc.setFontSize(12);
  doc.setTextColor(18, 18, 18);
  doc.text("Total", 400, y);
  doc.text(formatCurrency(Number(order.grand_total)), 555, y, { align: "right" });

  y += 40;
  const paymentLabel = PAYMENT_METHOD_LABEL[order.payment_method] ?? order.payment_method;
  doc.setFontSize(10);
  doc.setTextColor(107, 107, 107);
  doc.text(`Payment method: ${paymentLabel}`, 40, y);

  if (address) {
    y += 28;
    doc.setFontSize(9);
    doc.setTextColor(107, 107, 107);
    doc.text("DELIVERING TO", 40, y);
    y += 16;
    doc.setFontSize(11);
    doc.setTextColor(18, 18, 18);
    doc.text(String(address.recipient_name), 40, y);
    y += 15;
    doc.setFontSize(10);
    const line2 = address.line2 ? `, ${address.line2}` : "";
    doc.text(`${address.line1}${line2}`, 40, y);
    y += 15;
    const cityLine = [city?.name, district?.name].filter(Boolean).join(", ") + (address.postal_code ? ` ${address.postal_code}` : "");
    doc.text(cityLine, 40, y);
  }

  return Buffer.from(doc.output("arraybuffer"));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
