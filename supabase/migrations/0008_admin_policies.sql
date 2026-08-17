-- 0008_admin_policies.sql
-- Additional RLS policies discovered while building the admin panel.
-- (audit_logs had a read policy but no write policy — staff mutations
-- logged via src/lib/admin/audit.ts would otherwise be silently blocked.)
--
-- Idempotent: every policy is dropped first if it exists, so this file is
-- safe to re-run against a project that already has some or all of it applied.

drop policy if exists "audit_logs_staff_write" on public.audit_logs;
create policy "audit_logs_staff_write" on public.audit_logs for insert with check (public.is_staff());

-- Customers need to be listed/searched in the admin Customers screen.
-- profiles already has "profiles_staff_manage" (all) which covers this,
-- included here only as a confirmation comment — no new policy needed.

-- Admin order status changes go through direct table updates (staff has
-- "orders_staff_update"), which is correct for the admin panel (unlike the
-- customer-facing checkout flow, which had to route through SECURITY
-- DEFINER functions in 0002/0007 because customers aren't staff).

-- ---------------------------------------------------------------------
-- Storage: a single public "media" bucket for book covers, category
-- images, author/publisher photos, and homepage banner images. Publicly
-- READABLE (product images need to render on the storefront without
-- auth), but only staff can upload/modify/delete.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists "media_bucket_public_read" on storage.objects;
create policy "media_bucket_public_read" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media_bucket_staff_insert" on storage.objects;
create policy "media_bucket_staff_insert" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_staff());

drop policy if exists "media_bucket_staff_update" on storage.objects;
create policy "media_bucket_staff_update" on storage.objects
  for update using (bucket_id = 'media' and public.is_staff());

drop policy if exists "media_bucket_staff_delete" on storage.objects;
create policy "media_bucket_staff_delete" on storage.objects
  for delete using (bucket_id = 'media' and public.is_staff());
