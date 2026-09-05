-- 0026_page_views.sql
--
-- Lightweight, privacy-minimal traffic tracking for the admin dashboard.
-- No IP address, no user agent, no account linkage — just which storefront
-- path was viewed, when, and an anonymous per-browser id (a random UUID in
-- a cookie, set by middleware) so "unique visitors" can be distinguished
-- from raw page views.
--
-- Written only by middleware (via the service-role key, server-side only —
-- never reachable from the browser) and read only by the admin dashboard
-- (also service-role, gated by requireStaff() at the page level) — so RLS
-- simply denies every anon/authenticated-role access by not defining any
-- policy for them, rather than needing bespoke policies.

create table public.page_views (
  id bigint generated always as identity primary key,
  path text not null,
  visitor_id uuid not null,
  created_at timestamptz not null default now()
);

create index page_views_created_at_idx on public.page_views (created_at);
create index page_views_path_idx on public.page_views (path);

alter table public.page_views enable row level security;
