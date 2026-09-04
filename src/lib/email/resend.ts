import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;

/** Returns null (rather than throwing) when RESEND_API_KEY isn't configured
 *  yet — lets order placement keep working before email is set up, instead
 *  of failing checkout over a missing env var. */
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}
