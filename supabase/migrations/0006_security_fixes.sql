-- 0006_security_fixes.sql
--
-- Delta fix for a project that already applied 0001-0004 in their original
-- form. The original `order_items` insert policy had a `... or true` clause
-- that made it accidentally world-writable (any authenticated user could
-- insert fake line items into ANY order, not just their own). This file is
-- idempotent and safe to run once against an already-applied project.
--
-- (On a brand-new project applying 0001-0006 in order, 0003 already
-- contains the corrected policy directly, so this file is a no-op there —
-- the `drop policy if exists` / re-create is still safe to run.)

drop policy if exists "order_items_staff_write" on public.order_items;
drop policy if exists "order_items_owner_insert" on public.order_items;

create policy "order_items_owner_insert" on public.order_items for insert with check (
  public.is_staff()
  or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
);
