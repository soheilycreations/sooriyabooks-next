-- 0013_staff_members_rls.sql
--
-- staff_members has had NO row-level security enabled and NO policies at
-- all since it was created in 0001 — a real gap, found while diagnosing
-- an admin-login issue, not a side effect of that issue. Two consequences:
--
--   1. Security: with RLS off, the table's readability (and, depending on
--      Supabase's default schema grants, writability) falls back to
--      whatever the `anon`/`authenticated` Postgres roles were granted at
--      creation — on a standard Supabase project that can include SELECT
--      and even INSERT/UPDATE/DELETE. Left as-is, this table (which grants
--      admin-panel access) was not properly locked down.
--
--   2. Once RLS IS enabled (this migration), it becomes deny-by-default,
--      and getStaffRole() (src/lib/auth/session.ts) queries this table
--      DIRECTLY as the signed-in user — not through the SECURITY DEFINER
--      is_staff()/current_staff_role() helpers, which bypass RLS. Without
--      an explicit self-read policy, enabling RLS here would break admin
--      login for every legitimately-provisioned admin, not just fix the
--      security gap. Idempotent (drop-then-create), safe to re-run.

alter table public.staff_members enable row level security;

drop policy if exists "staff_members_self_read" on public.staff_members;
create policy "staff_members_self_read" on public.staff_members
  for select using (id = auth.uid());

-- Only an existing admin can grant/revoke staff access (including
-- promoting/demoting other staff) — managers/editors cannot self-elevate
-- or add other staff. current_staff_role() is SECURITY DEFINER, so this
-- doesn't recurse into RLS on this same table.
drop policy if exists "staff_members_admin_manage" on public.staff_members;
create policy "staff_members_admin_manage" on public.staff_members
  for all using (public.current_staff_role() = 'admin') with check (public.current_staff_role() = 'admin');

-- Note: this means the very FIRST staff_members row can only be created
-- via the Supabase SQL Editor or service-role access (RLS has no
-- "admin" yet to satisfy staff_members_admin_manage) — which is the
-- correct, expected bootstrapping path, not a bug. See the deployment
-- notes for the exact statement.
