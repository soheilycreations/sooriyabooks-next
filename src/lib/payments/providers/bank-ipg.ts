import crypto from "node:crypto";
import type { PaymentProvider, PaymentIntent, PaymentResult } from "../types";

/**
 * Sri Lankan bank IPG (hosted-checkout) integration, architected from the
 * general shape of Sampath Bank / LankaPay-style hosted gateways
 * (reverse-engineered from the legacy WooCommerce plugin's config surface
 * during the forensic audit: client_id, hmac_secret, auth_token, pg_domain,
 * a REST create-payment call, a hosted redirect, and a signed server-to-
 * server callback). This is a real, wireable implementation shape — the
 * exact endpoint path/payload field names are marked TODO below and must
 * be confirmed against the bank's current merchant integration docs before
 * going live; every other piece (signing, verification, error handling,
 * env var wiring) is complete.
 *
 * Required environment variables (see .env.example):
 *   BANK_IPG_MERCHANT_ID, BANK_IPG_SECRET, BANK_IPG_ENV ("sandbox" | "production")
 */

const BASE_URLS: Record<string, string> = {
  sandbox: "https://sandbox.ipg.example-bank.lk/api/v1", // TODO: replace with the real sandbox host from the bank's merchant portal
  production: "https://ipg.example-bank.lk/api/v1", // TODO: replace with the real production host
};

function getConfig() {
  const merchantId = process.env.BANK_IPG_MERCHANT_ID;
  const secret = process.env.BANK_IPG_SECRET;
  const env = process.env.BANK_IPG_ENV === "production" ? "production" : "sandbox";
  if (!merchantId || !secret) {
    throw new Error("Bank IPG is not configured — set BANK_IPG_MERCHANT_ID and BANK_IPG_SECRET");
  }
  return { merchantId, secret, baseUrl: BASE_URLS[env] };
}

function signPayload(payload: Record<string, unknown>, secret: string): string {
  const canonical = Object.keys(payload)
    .sort()
    .map((k) => `${k}=${payload[k]}`)
    .join("&");
  return crypto.createHmac("sha256", secret).update(canonical).digest("hex");
}

export const bankIpgProvider: PaymentProvider = {
  id: "bank_ipg",

  async createIntent({ orderId, orderNumber, amount, customerEmail }): Promise<PaymentIntent> {
    const { merchantId, secret, baseUrl } = getConfig();

    const payload = {
      merchant_id: merchantId,
      order_reference: orderNumber,
      amount: amount.toFixed(2),
      currency: "LKR",
      customer_email: customerEmail ?? "",
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/return?orderId=${orderId}`,
      callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/bank-ipg`,
    };
    const signature = signPayload(payload, secret);

    // TODO: confirm the real endpoint path and response field names with the
    // bank's integration docs (this call structure — POST a signed JSON
    // payload, receive a hosted-checkout redirect URL + session reference —
    // matches the standard pattern for this class of Sri Lankan bank IPG).
    const response = await fetch(`${baseUrl}/payments/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, signature }),
    });

    if (!response.ok) {
      throw new Error(`Bank IPG createIntent failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as { session_id: string; redirect_url: string };
    return {
      providerReference: data.session_id,
      redirectUrl: data.redirect_url,
    };
  },

  async handleWebhook(payload: unknown, signatureHeader: string | null): Promise<PaymentResult> {
    const { secret } = getConfig();
    const body = payload as Record<string, unknown>;

    if (!signatureHeader) {
      return { success: false, providerReference: "", amount: 0, rawResponse: payload, errorMessage: "Missing signature header" };
    }

    // TODO: confirm the exact fields the bank includes in its callback body
    // and whether the signature covers the raw body or a canonicalized
    // subset of fields (this implementation assumes the latter, matching
    // createIntent's signing convention above — adjust to match their spec).
    const { signature: _ignored, ...unsigned } = body;
    const expectedSignature = signPayload(unsigned, secret);
    const providedBuffer = Buffer.from(signatureHeader);
    const expectedBuffer = Buffer.from(expectedSignature);

    // timingSafeEqual throws (rather than returning false) if the two
    // buffers differ in length — a malformed or wrong-length signature
    // header must never crash the check, only fail it.
    const isValid =
      providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);

    if (!isValid) {
      return { success: false, providerReference: "", amount: 0, rawResponse: payload, errorMessage: "Invalid signature" };
    }

    const status = String(body.status ?? "").toLowerCase();
    return {
      success: status === "success" || status === "paid" || status === "completed",
      providerReference: String(body.session_id ?? ""),
      amount: Number(body.amount ?? 0),
      rawResponse: payload,
      errorMessage: status === "success" ? undefined : `Payment status: ${status}`,
    };
  },
};
