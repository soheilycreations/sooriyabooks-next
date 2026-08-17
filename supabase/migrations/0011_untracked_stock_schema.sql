-- 0011_untracked_stock_schema.sql
--
-- Business decision (not a technical default): many WordPress products
-- have no numeric stock count at all — WooCommerce's "Manage stock?" was
-- off, so only a binary in-stock/out-of-stock flag ever existed, never a
-- quantity. Rather than fabricate a quantity (e.g. defaulting to 100) or
-- import everything as 0 (which would make the whole catalog appear
-- out-of-stock immediately), a product can now be explicitly in
-- "untracked" mode: sellable or not, with no numeric stock enforcement.
--
-- stock_tracking_enabled = true  -> existing numeric behavior, unchanged.
-- stock_tracking_enabled = false -> quantity_on_hand/quantity_reserved are
--   not used for availability; untracked_available is the sole signal.

alter table public.inventory
  add column if not exists stock_tracking_enabled boolean not null default true,
  add column if not exists untracked_available boolean not null default true;
