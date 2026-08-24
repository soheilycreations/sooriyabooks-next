"use client";

import { useState } from "react";
import { Facebook, Twitter, MessageCircle, Link2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Share-intent links for a product page — no API keys needed, just the standard web share-intent URLs each platform exposes. */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const links = [
    {
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: Facebook,
    },
    {
      label: "Share on Twitter / X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: Twitter,
    },
    {
      label: "Share on WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      icon: MessageCircle,
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Share</span>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          className="flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
        >
          <link.icon className="h-3.5 w-3.5" />
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copy link"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-accent hover:text-accent",
          copied && "border-accent text-accent",
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
