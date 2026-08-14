# SooriyaBooks Commerce Platform V2

A ground-up rebuild of sooriyabooks.lk as a modern, type-safe e-commerce platform. WordPress is used only as a business reference (products, categories, shipping rules, branding) — no WordPress code or architecture is reused. See `docs/` for the full design.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · shadcn/ui (owned components) · Framer Motion · Supabase (Postgres + Auth + Storage) · Upstash Redis · Vercel · pnpm

## Status

**Phase 0 (foundation) in progress.** See `docs/feature-list.md` for the full phased build plan and what's done vs. pending.

This repo currently contains:
- Full architecture, database schema, folder structure, API design, and migration plan docs (`docs/`)
- Complete normalized PostgreSQL schema + RLS policies + business-logic functions, ready to apply (`supabase/migrations/`)
- Next.js project scaffold with the brand theme (colors/fonts reverse-engineered from the legacy site) wired into Tailwind
- A working homepage shell with placeholder content (not yet wired to Supabase — no live project exists yet)

**Not yet done:** most storefront pages, the entire admin panel, checkout/payments, auth, and the data migration ETL. See `docs/feature-list.md`.

## Getting started (once Node.js/pnpm are available)

```bash
pnpm install
cp .env.example .env.local   # fill in once Supabase project exists
pnpm dev
```

## Database

Schema lives in `supabase/migrations/`, applied in order:
1. `0001_init_schema.sql` — tables
2. `0002_functions.sql` — shipping calc, stock reservation, coupon redemption, order numbering
3. `0003_rls_policies.sql` — row-level security (the primary authorization layer)
4. `0004_seed_reference_data.sql` — payment providers, Sri Lanka districts, default weight bands, default homepage layout

Apply via the Supabase CLI once a project exists:
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## Docs

- [`docs/architecture.md`](docs/architecture.md) — system design, module boundaries, security model
- [`docs/database-schema` (see migrations)](supabase/migrations/) — normalized schema
- [`docs/folder-structure.md`](docs/folder-structure.md)
- [`docs/api-design.md`](docs/api-design.md) — Server Actions + Route Handlers
- [`docs/feature-list.md`](docs/feature-list.md) — phased build plan
- [`docs/migration-plan.md`](docs/migration-plan.md) — WordPress data → V2 ETL plan
