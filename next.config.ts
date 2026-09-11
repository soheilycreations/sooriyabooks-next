import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Vercel's Image Optimization API bills per unique source image
    // per month. With ~4,800 book covers each requested at several
    // responsive widths, the Hobby plan's quota was exhausted mid-month —
    // every cover on the site started 402ing. Serving the originals
    // straight from Supabase Storage (already reasonably sized) trades a
    // bit of on-the-fly resizing/format conversion for images that never
    // stop working.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
    serverActions: {
      // Default is 1MB, which a real phone photo clears easily (uploadMedia()
      // in lib/media/actions.ts already enforces the real 10MB ceiling
      // itself) — Next.js was silently rejecting the request before our
      // code ever ran, surfacing as an opaque "error occurred in the Server
      // Components render" with no useful detail.
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // camera=(self), not camera=() — the admin barcode scanner
          // (components/admin/barcode-scanner-button.tsx) needs camera
          // access on this origin; camera=() blocked it site-wide entirely.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
