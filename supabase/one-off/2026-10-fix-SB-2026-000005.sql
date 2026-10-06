-- One-off data fix (NOT a migration: run it once by hand in the Supabase SQL Editor).
--
-- SB-2026-000005 is a card order that was marked status 'failed' during checkout
-- but never had its payment_status updated, so it reads failed / pending. The
-- payment did not complete, so payment_status should be 'failed' too.
--
-- Checked before writing this: all four books on the order are untracked, so
-- the order holds no reserved stock and nothing needs releasing. It was the
-- only failed order with a pending payment_status.
--
-- Guarded by the order's current state, so running it twice (or on an order
-- that has since changed) updates nothing.

update public.orders
set payment_status = 'failed', updated_at = now()
where order_number = 'SB-2026-000005'
  and status = 'failed'
  and payment_status = 'pending'
returning order_number, status, payment_status;
-- Expect exactly one row: SB-2026-000005 | failed | failed
