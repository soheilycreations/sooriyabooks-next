import type { PaymentProvider, PaymentIntent, PaymentResult } from "../types";

/**
 * Cash on Delivery: no external gateway. "Payment" is collected by the
 * courier on delivery — createIntent is a no-op (checkout confirms the
 * order immediately via confirm_cod_order(), see src/lib/orders/actions.ts),
 * and there is no webhook to receive.
 */
export const codProvider: PaymentProvider = {
  id: "cod",

  async createIntent({ orderId }): Promise<PaymentIntent> {
    return { providerReference: `cod_${orderId}` };
  },

  async handleWebhook(): Promise<PaymentResult> {
    throw new Error("Cash on Delivery has no webhook");
  },
};
