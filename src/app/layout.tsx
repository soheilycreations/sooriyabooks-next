import type { Metadata } from "next";
import { Jost, Marcellus } from "next/font/google";
import { ThemeProvider } from "@/components/shared/theme-provider";
import "./globals.css";

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marcellus",
  display: "swap",
});

export const metadata: Metadata = {
  // `||`, not `??` — Vercel can have NEXT_PUBLIC_SITE_URL set to an empty
  // string rather than left unset, and `??` only falls back on
  // null/undefined, not "". An empty string reaching new URL() throws
  // ERR_INVALID_URL and fails the entire build (surfaced as a mysterious
  // "/_not-found" page-data-collection error, since /_not-found is the
  // first page to evaluate this root layout's metadata).
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://sooriyabooks.lk"),
  title: {
    default: "Sooriya Publishers | Buy Books Online in Sri Lanka",
    template: "%s | Sooriya Publishers",
  },
  description:
    "Buy quality books online from Sooriya Publishers, Sri Lanka's trusted publishing and distribution company since 1994. Island-wide delivery available.",
  openGraph: {
    type: "website",
    siteName: "Sooriya Publishers",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jost.variable} ${marcellus.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-body text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
