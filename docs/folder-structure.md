# Folder Structure

```
sooriyabooks-v2/
├── docs/                          # architecture, schema, plans (this set of files)
├── supabase/
│   └── migrations/                 # versioned SQL, applied via Supabase CLI
├── src/
│   ├── app/
│   │   ├── (storefront)/            # public site — route group, shared layout
│   │   │   ├── page.tsx              # homepage
│   │   │   ├── category/[slug]/
│   │   │   ├── book/[slug]/
│   │   │   ├── author/[slug]/
│   │   │   ├── publisher/[slug]/
│   │   │   ├── search/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   ├── account/
│   │   │   │   ├── orders/
│   │   │   │   ├── orders/[id]/
│   │   │   │   ├── wishlist/
│   │   │   │   ├── addresses/
│   │   │   │   └── profile/
│   │   │   ├── blog/, blog/[slug]/
│   │   │   ├── about/, contact/, privacy/, terms/
│   │   │   └── not-found.tsx
│   │   ├── (auth)/
│   │   │   ├── login/, register/, forgot-password/
│   │   ├── admin/                    # staff-only, middleware-gated
│   │   │   ├── layout.tsx             # sidebar shell + auth guard
│   │   │   ├── page.tsx                # dashboard
│   │   │   ├── products/, products/[id]/
│   │   │   ├── categories/, authors/, publishers/
│   │   │   ├── orders/, orders/[id]/
│   │   │   ├── customers/
│   │   │   ├── coupons/
│   │   │   ├── inventory/
│   │   │   ├── reviews/
│   │   │   ├── media/
│   │   │   ├── blog/
│   │   │   ├── seo/
│   │   │   ├── homepage/               # hero slider, banners, featured sections
│   │   │   ├── shipping/               # districts, cities, weight bands, rates
│   │   │   ├── payments/
│   │   │   ├── analytics/
│   │   │   ├── settings/
│   │   │   └── logs/
│   │   ├── api/
│   │   │   ├── webhooks/bank-ipg/       # payment gateway callback
│   │   │   ├── sitemap.xml/
│   │   │   └── robots.txt/
│   │   ├── layout.tsx                   # root layout, fonts, providers
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                        # shadcn/ui primitives (owned, not a dependency)
│   │   ├── storefront/                # ProductCard, CartDrawer, ReviewList, ...
│   │   ├── admin/                     # DataTable, AdminForm, ChartCard, ...
│   │   └── shared/                    # Header, Footer, SeoHead, Breadcrumbs
│   ├── lib/
│   │   ├── supabase/                  # server/client/edge Supabase clients
│   │   ├── catalog/, inventory/, pricing/, shipping/, orders/, payments/,
│   │   │   customers/, content/, admin/     # one folder per architecture module
│   │   ├── validation/                # Zod schemas, shared client+server
│   │   ├── cache/                     # Upstash Redis helpers
│   │   └── utils/
│   ├── types/                          # generated Supabase types + domain types
│   └── middleware.ts                    # auth gate for /admin and /account
├── public/                              # static assets, PWA icons, manifest
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml
```

**Rule:** a component/lib file belongs to exactly one module folder (see architecture.md §5). Cross-module logic is imported as a typed function call, never a direct Supabase query against another module's table from inside a different module's folder — keeps boundaries real, not just nominal.
