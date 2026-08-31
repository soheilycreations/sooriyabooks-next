/**
 * Payment provider abstraction (docs/architecture.md §6). Each provider
 * implements this interface; adding a new gateway later (Stripe, PayPal,
 * another Sri Lankan bank IPG) means adding one new file here plus a
 * `payment_providers` row — no changes to checkout/order code.
 */
export interface PaymentIntent {
  /** Provider-specific reference/session id to correlate with the webhook later. */
  providerReference: string;
  /** Where to send the customer to complete payment (bank-hosted checkout page). */
  redirectUrl?: string;
  /** Opaque provider payload the client may need (e.g. an SDK config). */
  clientPayload?: Record<string, unknown>;
}

export interface PaymentResult {
  success: boolean;
  providerReference: string;
  amount: number;
  rawResponse: unknown;
  errorMessage?: string;
}

export interface PaymentProvider {
  id: string; // matches payment_providers.id in the database
  /** Starts a payment: called right after order creation for non-COD methods. */
  createIntent(params: { orderId: string; orderNumber: string; amount: number; customerEmail?: string }): Promise<PaymentIntent>;
  /**
   * Confirms a payment after the customer returns from the provider's
   * hosted checkout, by calling the provider's own verification API
   * server-to-server — never trust the return redirect itself, it's
   * usually unsigned and just a trigger. Optional because not every
   * provider needs it (Cash on Delivery confirms immediately, no gateway
   * round-trip).
   */
  verifyReturn?(providerReference: string): Promise<PaymentResult>;
  /** Optional: issue a refund (not all providers/phases need this immediately). */
  refund?(params: { providerReference: string; amount: number }): Promise<PaymentResult>;
}
