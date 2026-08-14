# Feature List & Build Phases

Tracked as phases so progress is visible and each phase ends in a runnable, committed state.

## Phase 0 — Foundation (this session)
- [x] Architecture, schema, folder structure, migration plan docs
- [x] Full normalized Postgres schema + RLS policies + business-logic functions (SQL, ready to apply)
- [ ] Next.js 15 + TS + Tailwind + shadcn/ui scaffold, brand theme wired in
- [ ] Supabase client setup (server/browser/middleware), typed
- [ ] Base layout, header/footer, design tokens applied
- [ ] Git repo initialized, first commits

## Phase 1 — Storefront core
- [ ] Homepage (admin-managed sections rendered)
- [ ] Category listing + filters
- [ ] Book detail page (gallery, price, stock, reviews)
- [ ] Author / Publisher pages
- [ ] Full-text search
- [ ] Cart (client state + server-synced) with live shipping estimate
- [ ] Checkout (address, shipping calc, coupon, COD + Bank IPG)
- [ ] Order confirmation + tracking page

## Phase 2 — Customer account
- [ ] Auth (Supabase Auth: register/login/reset)
- [ ] Profile, addresses, password
- [ ] Order history + invoices
- [ ] Wishlist (save/remove/move to cart)
- [ ] Reviews (submit, edit while pending)

## Phase 3 — Admin panel core
- [ ] Auth-gated admin shell + role-based nav
- [ ] Products CRUD (+ images, SEO fields)
- [ ] Categories / Authors / Publishers CRUD
- [ ] Orders management + status workflow
- [ ] Customers list + detail
- [ ] Inventory (stock history, low-stock alerts, manual adjustments, reserved stock view)
- [ ] Coupons CRUD (all rule types)
- [ ] Reviews moderation + reply
- [ ] Media library
- [ ] Shipping admin (districts/cities/weight bands/rates)
- [ ] Payment settings
- [ ] Homepage section manager (hero slider, banners, featured lists, popup)
- [ ] Blog CRUD
- [ ] SEO panel (per-entity meta, sitemap status, redirects)
- [ ] Settings (store info, branding)
- [ ] System logs viewer

## Phase 4 — Reports & analytics
- [ ] Dashboard charts (sales, revenue, orders, customers, products, inventory, best sellers)
- [ ] Date filters (today/yesterday/week/month/year/custom)
- [ ] Export (Excel/PDF/CSV)

## Phase 5 — SEO & performance hardening
- [ ] Metadata API usage across all routes (title/description/OG/Twitter/canonical)
- [ ] JSON-LD (Product, BreadcrumbList, Organization)
- [ ] XML sitemap + robots.txt generation
- [ ] URL redirect table wired into middleware (legacy URL continuity)
- [ ] Image optimization audit, lazy loading, code splitting review
- [ ] Lighthouse pass (target 95+)

## Phase 6 — PWA
- [ ] Manifest + icons (Android/iOS)
- [ ] Service worker (offline shell, cache strategy)
- [ ] Install prompts, splash screens

## Phase 7 — Security & ops hardening
- [ ] Rate limiting (Upstash) on auth/checkout/search/review endpoints
- [ ] Zod validation coverage audit across all Server Actions
- [ ] Audit log coverage for all staff mutations
- [ ] CSP headers, security headers review

## Phase 8 — Data migration (see migration-plan.md)
- [ ] ETL scripts (parse dump → transform → load)
- [ ] Shipping plugin data reverse-engineering + import
- [ ] Product/category/media import + verification report
- [ ] URL redirect population
- [ ] Real-customer-only account migration

## Phase 9 — Deploy
- [ ] User provisions Supabase project, GitHub repo, Vercel project
- [ ] Migrations applied to live Supabase
- [ ] Environment variables configured in Vercel
- [ ] Staging verification, then production cutover

## Future-ready hooks (not built now, architecture accommodates them)
POS, ERP integration, loyalty/points, gift cards, mobile app (same Supabase backend), AI recommendations, AI search — each becomes a new module under `src/lib/<module>` calling existing `catalog`/`orders`/`inventory` functions, per architecture.md §5.
