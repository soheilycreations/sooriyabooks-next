"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import Script from "next/script";

// Minimal ambient typing for the bit of the reCAPTCHA v2 API this component
// actually uses — there's no official @types package for it.
declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (container: HTMLElement, params: Record<string, unknown>) => number;
      reset: (widgetId?: number) => void;
    };
  }
}

/** True once NEXT_PUBLIC_RECAPTCHA_SITE_KEY is configured — forms check
 *  this to decide whether to render the widget and require a token at all,
 *  so nothing breaks before the site key exists. */
export const RECAPTCHA_ENABLED = Boolean(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);

/**
 * Google reCAPTCHA v2 ("I'm not a robot" checkbox), on login, register,
 * contact, and review forms — stops the same kind of scripted signup/
 * spam/brute-force abuse a bot would otherwise automate freely, since
 * every one of those actions is otherwise a plain unauthenticated POST.
 * Renders nothing (and never loads Google's script) until
 * NEXT_PUBLIC_RECAPTCHA_SITE_KEY is set.
 */
export function Recaptcha({ onVerify, onExpire }: { onVerify: (token: string) => void; onExpire?: () => void }) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const domId = useId();

  const render = useCallback(() => {
    if (!siteKey || !window.grecaptcha) return;
    // grecaptcha.render() isn't safe to call the instant the <script> tag's
    // load event fires — the library's own internals are still finishing
    // async setup at that point. grecaptcha.ready() is Google's documented
    // way to wait for the real "you can call render() now" moment.
    window.grecaptcha.ready(() => {
      if (!containerRef.current || widgetId.current !== null || !window.grecaptcha) return;
      widgetId.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
        "expired-callback": () => onExpire?.(),
      });
    });
  }, [siteKey, onVerify, onExpire]);

  useEffect(() => {
    // Covers client-side navigation into a page where the script was
    // already loaded by an earlier page this session.
    if (window.grecaptcha) render();
  }, [render]);

  if (!siteKey) return null;

  return (
    <>
      <Script src="https://www.google.com/recaptcha/api.js" strategy="afterInteractive" onLoad={render} />
      <div ref={containerRef} id={`recaptcha-${domId}`} />
    </>
  );
}
