-- 0015_inventory_public_read.sql
--
-- Bug found in Phase 8 QA: public.inventory has only
-- "inventory_staff_only" (for all, using is_staff()) from
-- 0003_rls_policies.sql — no policy ever let a customer or anonymous
-- visitor read it, including through nested embeds
-- (books.select("...,inventory(...)")) used everywhere on the storefront
-- (product cards, PDP, category/search grids). Confirmed empirically:
-- GET /rest/v1/inventory returns 200 [] for the anon role, and every
-- nested books->inventory embed comes back null.
--
-- book/[slug]/page.tsx then defaults a null inventory to the worst case
-- (stockTrackingEnabled ?? true, onHand ?? 0), which computes
-- isAvailable = false unconditionally — every product has shown
-- "Out of Stock" to every customer regardless of real stock, since the
-- untracked-stock migrations (0011/0012) shipped.
--
-- This adds ONLY a public SELECT policy, scoped to reading — the
-- existing "inventory_staff_only" policy (for all, i.e. covering
-- insert/update/delete) is untouched, so write access is still
-- staff-only exactly as before. No column in this table is sensitive
-- (quantities, a threshold, and two booleans — no cost/supplier data),
-- so this is a plain row-level policy rather than a column-scoped view.

drop policy if exists "inventory_public_read" on public.inventory;
create policy "inventory_public_read" on public.inventory
  for select using (true);
