# SooriyaBooks Commerce Platform V2 — Software Architecture

## 1. Summary

A ground-up rebuild of the sooriyabooks.lk WordPress/WooCommerce store as a modern, type-safe, enterprise-grade platform. WordPress is used only as a business-logic reference (products, categories, shipping-by-city rules, branding) — no WordPress code, tables, or patterns are reused.

**Reverse-engineered business facts driving design decisions** (from the WP backup + SQL dump audit):
- Brand: "Sooriya Publishers" / sooriyabooks.lk — "Buy Books to your Doorstep". Sri Lankan publisher/distributor since 1994.
- Brand palette: warm amber/orange accent (`#f4a938` / `#f49c1a` / `#ff7e00`), black/white base, sale-badge orange `#ff7e00`.
- Typography: `Marcellus` (serif, headings — premium/editorial feel) + `Jost` (sans, body/UI).
- Catalog: ~4,822 products across 63 product categories, with author/publisher as first-class taxonomies.
- Shipping: custom weight-based, city-based pricing (no courier API) — matched by the "Cities & Shipping Zones for WooCommerce" plugin's data model (district → cities → weight ranges → price).
- Payments: Cash on Delivery + a Sri Lankan bank IPG (Sampath Bank) gateway.
- A "Blocked Users" business rule exists (one abusive customer blocked from ordering) — preserved as a customer-flagging feature in V2, generalized rather than hardcoded.
- Existing SEO investment (Rank Math meta/OG data, `/product/...`-style URLs) — URL structure preserved where reasonable; full SEO layer rebuilt server-side.

## 2. Architecture Style

**Modular monolith on the Next.js App Router**, backed by Supabase (Postgres + Auth + Storage), deployed on Vercel, cached with Upstash Redis. Not a microservices split — unnecessary at this scale and would slow delivery. Clean internal module boundaries (see §5) keep it decomposable later if needed (e.g., extracting the shipping-rate engine into an edge function).

```
┌─────────────────────────────────────────────────────────────┐
│  Vercel Edge Network (CDN, ISR cache, Edge Middleware)        │
└───────────────┬─────────────────────────────────────────────┘
                 │
   ┌─────────────▼──────────────┐        ┌────────────────────┐
   │  Next.js 15 App Router      │◄──────►│  Upstash Redis      │
   │  - Storefront (SSR/ISR)     │        │  (rate limit, hot   │
   │  - Admin Panel (SSR, auth)  │        │   cache, sessions)  │
   │  - Route Handlers (API)     │        └────────────────────┘
   │  - Server Actions           │
   └───────────────┬─────────────┘
                    │ Supabase JS (server + edge clients)
   ┌────────────────▼─────────────────────────────────────────┐
   │  Supabase                                                  │
   │  - Postgres (normalized schema, RLS policies)              │
   │  - Auth (customers + staff, separate role claims)          │
   │  - Storage (book covers, gallery, media library)            │
   │  - Realtime (optional: live inventory/order updates)        │
   └───────────────────────────────────────────────────────────┘
```

## 3. Frontend Architecture

- **Next.js 15 App Router + React 19 Server Components by default.** Client components only where interactivity requires it (cart drawer, filters, wishlist toggle, admin forms, charts).
- **Rendering strategy per route:**
  - Homepage, category pages, book detail pages → **ISR** (revalidate on-demand via webhook from admin mutations + a time-based fallback, e.g. 1h).
  - Search results → SSR (query-dependent, not cacheable per-URL usefully at scale) with Redis-cached hot queries.
  - Cart/checkout/account/admin → SSR, always fresh, auth-gated.
  - Blog → ISR, long revalidate window.
- **Styling:** Tailwind CSS with a design-token layer (`tailwind.config.ts` theme extension) mapped 1:1 to the brand palette/typography above, consumed by shadcn/ui primitives (owned copies in `src/components/ui`, not a runtime dependency — standard shadcn model).
- **Motion:** Framer Motion reserved for meaningful transitions (page transitions, cart drawer, image gallery, hero slider) — not decorative overuse, to protect Lighthouse scores.
- **State:** Server state via Server Components + Server Actions + React Query (client-side cache for cart/wishlist optimistic UI) — no heavyweight global client store needed.

## 4. Backend Architecture

- **Supabase Postgres** is the system of record. All business rules that must be atomic/consistent (stock decrement, reserved stock, coupon usage counters) are enforced with Postgres functions/triggers + row-level constraints, not just application code — this is what "real inventory" and "reserved stock" require to be correct under concurrent checkouts.
- **Two identity domains, one `auth.users` table, role-based:**
  - `customer` — self-service signup, storefront account features.
  - `staff` roles — `admin`, `manager`, `editor` (mapped in a `staff_roles` table + custom claim), gate the entire `/admin` route group via middleware + RLS.
- **Row-Level Security (RLS) is the primary authorization mechanism** — customers can only read/write their own orders, addresses, wishlist, reviews; staff roles get broader policies scoped by role. This means even if an API route has a bug, the database itself refuses unauthorized access — a stronger security posture than the WordPress capability system it replaces.
- **Route Handlers** (`src/app/api/**`) for webhook receivers (payment gateway callbacks) and anything that must run outside the Server Component render (file uploads, exports). Everything else uses **Server Actions** for mutations — less boilerplate, automatic CSRF protection, colocated with the UI that calls them.
- **Shipping engine** is a pure Postgres function (`calculate_shipping_cost(cart_weight, city_id)`) callable from both the cart Server Component and the checkout Server Action, so quote and charge can never disagree — the #1 correctness bug class in the old plugin-based approach.

## 5. Module Boundaries (within the monolith)

```
catalog        — books, authors, publishers, categories, search
inventory      — stock levels, stock history, reservations, low-stock alerts
pricing        — selling/discount price, coupons, coupon rules
shipping       — districts, cities, weight ranges, rate calculation
orders         — cart, checkout, order lifecycle, order tracking
payments       — payment provider abstraction (COD, Bank IPG today; pluggable)
customers      — accounts, addresses, wishlist, reviews
content        — blog, static pages, SEO fields, homepage sections
admin          — admin-only UI + server actions, audit log
platform       — auth/session, rate limiting, caching, observability
```

Each module owns its Postgres tables, its `src/lib/<module>/` server logic, and its `src/components/<module>/` UI. Cross-module calls go through typed functions, not direct table access from another module's UI — keeps the "future modules" goal (POS, ERP, loyalty) realistic, since those can become new modules that call the same `inventory`/`orders` functions rather than needing a rewrite.

## 6. Payments Abstraction

```ts
interface PaymentProvider {
  id: string;                 // "cod" | "sampath_ipg" | future providers
  createIntent(order): Promise<PaymentIntent>;
  handleWebhook(payload, signature): Promise<PaymentResult>;
  refund?(orderId, amount): Promise<RefundResult>;
}
```
A `payment_providers` registry table + a `PaymentProvider` interface per gateway. COD is the trivial "always succeeds, capture on delivery" implementation; the Bank IPG provider wraps the existing Sampath Bank integration's REST contract (reverse-engineered from `paycorp_sampath_ipg_promo_6`, rebuilt from scratch — not copied). Adding Stripe/PayPal/etc. later is a new file implementing the interface plus a settings-panel entry, no core changes.

## 7. Shipping Engine (business-critical, custom)

Reverse-engineered rule: `total_cart_weight → customer_city → shipping_price`, admin-managed at the District → City → Weight-Range → Price level. Modeled as:

```
shipping_districts (id, name, sort_order)
shipping_cities (id, district_id, name, sort_order)
shipping_weight_bands (id, min_weight_g, max_weight_g)
shipping_rates (id, city_id, weight_band_id, price, updated_at)
```
`calculate_shipping_cost(city_id, total_weight_g)` resolves the matching weight band and returns the rate, with a clear "no rate configured" error surfaced to checkout rather than silently defaulting — the old system's biggest risk class.

## 8. Caching Strategy

- **Upstash Redis**: rate limiting (auth, checkout, review submission, search), hot product/category read-through cache, session/cart token store for guest carts.
- **Next.js ISR + `revalidateTag`**: catalog pages invalidated on product/category mutation via admin Server Actions calling `revalidateTag('catalog')`.
- **Postgres**: materialized views for admin analytics (sales/revenue rollups) refreshed on a schedule, so dashboard queries never hit raw order tables at read time.

## 9. Security Model

- Supabase Auth (email/password + optional OAuth) with RLS as the authorization backbone (see §4).
- CSRF: Server Actions are CSRF-safe by framework default; Route Handlers (webhooks) verify provider signatures.
- Rate limiting via Upstash on auth, checkout, search, and review endpoints.
- Input validation with Zod schemas shared between client forms and server actions (single source of truth per entity).
- Audit log table (`audit_logs`) recording staff mutations (who/what/when/before/after) — replaces WordPress's lack of this entirely.
- Secrets only in Vercel/Supabase environment config, never in the repo; `.env.example` documents required vars with no real values.

## 10. Observability

- Structured logging from Server Actions/Route Handlers to a `system_logs` table (surfaced in the admin "System Logs" screen) + optionally forwarded to a hosted log sink later.
- Vercel Analytics + Web Vitals for the performance/Lighthouse goals.
- Error boundaries per route segment; Sentry-compatible error reporting wired via an env-gated adapter (off by default until the user provisions a DSN).

## 11. Deployment Topology

Local dev now → GitHub repo (user-owned, connected once ready) → Vercel (preview deployments per PR, production on `main`) → Supabase project (staging + production, migrations applied via the Supabase CLI/SQL migration files already versioned in `supabase/migrations`). This repo is designed so that step is a connect-and-deploy operation, not a rework.
