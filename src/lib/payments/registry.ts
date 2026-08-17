import type { PaymentProvider } from "./types";
import { codProvider } from "./providers/cod";
import { bankIpgProvider } from "./providers/bank-ipg";

const providers: Record<string, PaymentProvider> = {
  cod: codProvider,
  bank_ipg: bankIpgProvider,
};

export function getPaymentProvider(id: string): PaymentProvider {
  const provider = providers[id];
  if (!provider) throw new Error(`Unknown payment provider: ${id}`);
  return provider;
}
