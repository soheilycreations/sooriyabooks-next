import "server-only";

/**
 * Verifies a reCAPTCHA v2 token server-side against Google's siteverify
 * API. Returns true (does not block the form) when RECAPTCHA_SECRET_KEY
 * isn't configured yet — same "not configured yet" pattern as the Resend
 * email and Bank IPG integrations, so forms keep working before the keys
 * exist rather than failing closed on a missing env var.
 */
export async function verifyRecaptcha(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("verifyRecaptcha: siteverify request failed:", err);
    return false;
  }
}
