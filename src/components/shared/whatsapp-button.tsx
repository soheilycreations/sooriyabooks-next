import { MessageCircle } from "lucide-react";

/**
 * Floating site-wide WhatsApp contact button — only renders when a real
 * link is configured in /admin/settings (same "blank hides it" convention
 * the footer's social icons already use), so nothing fake ever ships.
 */
export function WhatsAppButton({ url }: { url: string }) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-6 right-6 z-40 flex items-center gap-3"
    >
      <span className="rounded-full bg-card px-4 py-2 text-sm text-foreground shadow-lg transition-opacity duration-300 ease-premium">
        Need Help? <strong className="font-semibold">Chat with us</strong>
      </span>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-300 ease-premium group-hover:scale-105">
        <MessageCircle className="h-6 w-6 fill-white" strokeWidth={0} />
      </span>
    </a>
  );
}
