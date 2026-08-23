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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://sooriyabooks.lk"),
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
