"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { createClient } from "@/lib/supabase/browser";
import { completeSocialSignIn } from "@/lib/auth/actions";

// Minimal ambient typing for the bit of Google Identity Services (GIS) this
// component actually uses — there's no official @types package for it.
interface GoogleCredentialResponse {
  credential: string;
}
interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  nonce: string;
  use_fedcm_for_prompt?: boolean;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}
interface GoogleAccountsId {
  initialize: (config: GoogleIdConfiguration) => void;
  prompt: (cb?: (notification: unknown) => void) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Google Identity Services, in one of two forms:
 * - variant="prompt" (default): the automatic floating One Tap UI. Mount
 *   once per layout; Google itself decides whether it's eligible to show
 *   (existing browser session, cooldown, dismissal history, browser
 *   support, etc.) — this never forces it or retries against a dismissal.
 * - variant="button": renders Google's own "Sign in with Google" button in
 *   place, for an explicit fallback (e.g. on /login). Same
 *   initialize()/callback/nonce as the prompt — one Google auth mechanism,
 *   not two.
 *
 * Both convert the resulting ID token into a real Supabase session via
 * supabase.auth.signInWithIdToken() (the current Supabase-documented flow
 * for GIS: a client-generated nonce is SHA-256 hashed and given to Google;
 * the raw nonce is then given to Supabase, which re-hashes and compares it
 * against the token's own nonce claim), then runs the same post-auth
 * checks the password flow gets via completeSocialSignIn(). If
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't configured, this renders nothing and
 * never loads the Google script.
 */
export function GoogleOneTap({
  enabled = true,
  variant = "prompt",
}: {
  enabled?: boolean;
  variant?: "prompt" | "button";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buttonRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const domId = useId();

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleCredential = useCallback(
    async (credential: string, nonce: string) => {
      try {
        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: credential,
          nonce,
        });
        if (authError) return;

        const result = await completeSocialSignIn();
        if (!result.ok) return;

        router.push(searchParams.get("redirectTo") || "/account");
        router.refresh();
      } catch {
        // A cancelled/failed social sign-in should fail quietly and leave
        // the customer able to use email/password or try again — not throw
        // a visible error for what's usually just a dismissed prompt.
      }
    },
    [router, searchParams],
  );

  const init = useCallback(async () => {
    if (!enabled || !clientId || initialized.current || !window.google) return;
    initialized.current = true;

    const rawNonce = crypto.randomUUID() + crypto.randomUUID();
    const hashedNonce = await sha256Hex(rawNonce);

    window.google.accounts.id.initialize({
      client_id: clientId,
      nonce: hashedNonce,
      use_fedcm_for_prompt: true,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (response) => {
        void handleCredential(response.credential, rawNonce);
      },
    });

    if (variant === "button" && buttonRef.current) {
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 320,
      });
    } else if (variant === "prompt") {
      // Notification-moment callback: a user simply not being eligible (no
      // browser session, cooldown, previously dismissed) is normal Google
      // behavior, not an application error — swallow it rather than
      // logging anything that looks like a failure.
      window.google.accounts.id.prompt(() => {});
    }
  }, [enabled, clientId, variant, handleCredential]);

  useEffect(() => {
    // Covers client-side navigation into a layout where this component
    // remounts after the GIS script was already loaded by an earlier page.
    if (window.google) void init();
  }, [init]);

  if (!clientId || !enabled) return null;

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => void init()} />
      {variant === "button" && <div ref={buttonRef} id={`google-btn-${domId}`} />}
    </>
  );
}
