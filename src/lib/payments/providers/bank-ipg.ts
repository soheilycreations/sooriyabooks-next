import crypto from "node:crypto";
import type { PaymentProvider, PaymentIntent, PaymentResult } from "../types";

/**
 * Sampath Bank's Paycorp-hosted IPG — the real gateway the legacy
 * WordPress site used (`woocommerce_sampathipgpromo_6_settings`, plugin
 * `paycorp_sampath_ipg_promo_6`, confirmed enabled; Direct Bank Transfer
 * and Cash on Delivery were the manual fallbacks, PayPal was configured
 * but disabled). This mirrors the actual legacy plugin's wire protocol,
 * extracted from its PHP source in the site backup — not guessed:
 *
 *   - One JSON envelope over a single REST endpoint; `operation` selects
 *     PAYMENT_INIT (start a payment) vs PAYMENT_COMPLETE (verify one).
 *   - Signed with HMAC-SHA256 of the *entire* JSON request body (not a
 *     canonicalized field list), hex-encoded, sent as an `HMAC` header,
 *     alongside a separate static `AUTHTOKEN` header.
 *   - Amounts are integer cents, not decimal.
 *   - There is no async server-to-server webhook. Paycorp POSTs the
 *     customer's browser back to `returnUrl` with just `clientRef` +
 *     `reqid` — unsigned, just a trigger. The merchant must itself then
 *     call PAYMENT_COMPLETE server-to-server to get the trusted result;
 *     see verifyReturn() below, called from
 *     src/app/api/payments/bank-ipg/return/route.ts, which is the actual
 *     endpoint Paycorp posts back to.
 *
 * Required environment variables (see .env.example):
 *   BANK_IPG_CLIENT_ID, BANK_IPG_AUTH_TOKEN, BANK_IPG_HMAC_SECRET
 *   BANK_IPG_ENDPOINT (optional — defaults to Sampath's live endpoint;
 *   override with whatever sandbox URL Sampath provides while testing)
 */

const DEFAULT_ENDPOINT = "https://sampath.paycorp.lk/rest/service/proxy";
const PROTOCOL_VERSION = "1.5.6";
const SUCCESS_RESPONSE_CODE = "00";

function getConfig() {
  const clientId = process.env.BANK_IPG_CLIENT_ID;
  const authToken = process.env.BANK_IPG_AUTH_TOKEN;
  const hmacSecret = process.env.BANK_IPG_HMAC_SECRET;
  const endpoint = process.env.BANK_IPG_ENDPOINT || DEFAULT_ENDPOINT;
  if (!clientId || !authToken || !hmacSecret) {
    throw new Error("Bank IPG is not configured — set BANK_IPG_CLIENT_ID, BANK_IPG_AUTH_TOKEN, BANK_IPG_HMAC_SECRET");
  }
  return { clientId, authToken, hmacSecret, endpoint };
}

function formatRequestDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

interface PaycorpResponse {
  responseData?: Record<string, unknown>;
}

async function callPaycorp(operation: "PAYMENT_INIT" | "PAYMENT_COMPLETE", requestData: Record<string, unknown>): Promise<PaycorpResponse> {
  const { authToken, hmacSecret, endpoint } = getConfig();

  const body = {
    version: PROTOCOL_VERSION,
    msgId: crypto.randomUUID(),
    operation,
    requestDate: formatRequestDate(new Date()),
    validateOnly: false,
    requestData,
  };
  // The legacy plugin HMACs the exact JSON body string it POSTs, not a
  // reconstructed field list — must sign the already-serialized string.
  const bodyString = JSON.stringify(body);
  const hmac = crypto.createHmac("sha256", hmacSecret).update(bodyString).digest("hex");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", HMAC: hmac, AUTHTOKEN: authToken },
    body: bodyString,
  });

  if (!response.ok) {
    throw new Error(`Bank IPG ${operation} failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as PaycorpResponse;
}

export const bankIpgProvider: PaymentProvider = {
  id: "bank_ipg",

  async createIntent({ orderId, orderNumber, amount, customerEmail }): Promise<PaymentIntent> {
    const { clientId } = getConfig();
    const cents = Math.round(amount * 100);

    const { responseData } = await callPaycorp("PAYMENT_INIT", {
      clientId,
      clientIdHash: null,
      transactionType: "PURCHASE",
      transactionAmount: { totalAmount: cents, paymentAmount: cents, serviceFeeAmount: 0, currency: "LKR" },
      redirect: {
        returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/bank-ipg/return`,
        cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/return?orderId=${orderId}`,
        returnMethod: "POST",
      },
      clientRef: orderNumber,
      comment: `Order ${orderNumber}`,
      tokenize: false,
      tokenReference: null,
      useReliability: true,
      extraData: { orderId, customerEmail: customerEmail ?? "" },
    });

    const paymentPageUrl = responseData?.paymentPageUrl;
    const reqid = responseData?.reqid;
    if (typeof paymentPageUrl !== "string" || typeof reqid !== "string") {
      throw new Error("Bank IPG PAYMENT_INIT did not return a payment page URL");
    }

    return { providerReference: reqid, redirectUrl: paymentPageUrl };
  },

  async verifyReturn(reqid: string): Promise<PaymentResult> {
    const { clientId } = getConfig();
    const { responseData } = await callPaycorp("PAYMENT_COMPLETE", { clientId, reqid });
    const data = responseData ?? {};
    const responseCode = String(data.responseCode ?? "");
    const paidAmount = (data.transactionAmount as { paymentAmount?: number } | undefined)?.paymentAmount;

    return {
      success: responseCode === SUCCESS_RESPONSE_CODE,
      providerReference: reqid,
      amount: typeof paidAmount === "number" ? paidAmount / 100 : 0,
      rawResponse: data,
      errorMessage:
        responseCode === SUCCESS_RESPONSE_CODE ? undefined : `Payment status: ${String(data.responseText ?? responseCode)}`,
    };
  },
};
