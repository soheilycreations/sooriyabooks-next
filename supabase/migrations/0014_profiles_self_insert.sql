-- 0014_profiles_self_insert.sql
--
-- profiles had self_read and self_update policies but NO self_insert
-- policy — found while tracing a checkout failure
-- ("addresses_customer_id_fkey" violation). addresses.customer_id (and
-- orders/reviews/wishlist_items) reference profiles(id), and the ONLY
-- code that ever creates a profiles row is signUp()'s upsert
-- (src/lib/auth/actions.ts) — which, without this policy, would itself
-- have been silently rejected by RLS for every customer who registered
-- through the app's own form, not just accounts created directly in the
-- Supabase Dashboard. This is the same gap either way: no policy ever
-- let a non-staff user insert their own profiles row.
--
-- Scoped identically to the existing self_read/self_update policies
-- (id = auth.uid()) — a customer may only ever insert a row for
-- themselves, never on behalf of another user. Idempotent, safe to re-run.

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert with check (id = auth.uid());
