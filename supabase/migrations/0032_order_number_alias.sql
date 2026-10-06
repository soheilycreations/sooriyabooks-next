-- 0032_order_number_alias.sql
--
-- Lets an order keep answering to its OLD number after it has been renumbered.
-- Needed once, when two databases are merged and one guest COD order has to move
-- from SB-2026-000053 to SB-2026-000095 so that a different, card-paid order can
-- keep SB-2026-000053 (the reference the bank already holds for it). The COD
-- customer still has "SB-2026-000053" in their confirmation email, so tracking by
-- that number must keep working.
--
-- previous_order_number is NULL for every normal order. track_guest_order() now
-- matches a number against EITHER order_number OR previous_order_number. Two
-- different orders can therefore answer to the same number, and the phone number
-- the customer must also supply decides which one is returned.
--
-- The function keeps exactly the same inputs and outputs as 0030's version, so
-- nothing in the app needs to change. Requires 0030 (it uses phone_tail9()).
-- Safe to re-run.

alter table public.orders add column if not exists previous_order_number text;

-- An old number can only ever have been given up by one order.
create unique index if not exists orders_previous_order_number_key
  on public.orders (previous_order_number)
  where previous_order_number is not null;

create or replace function public.track_guest_order(p_order_number text, p_phone text)
returns table (
  order_id uuid,
  order_number text,
  status order_status,
  payment_method payment_method,
  payment_status payment_status,
  subtotal numeric,
  discount_total numeric,
  shipping_total numeric,
  grand_total numeric,
  placed_at timestamptz,
  recipient_name text,
  phone text,
  line1 text,
  line2 text,
  postal_code text,
  city_name text,
  district_name text,
  items jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select
    o.id, o.order_number, o.status, o.payment_method, o.payment_status,
    o.subtotal, o.discount_total, o.shipping_total, o.grand_total, o.placed_at,
    a.recipient_name, a.phone, a.line1, a.line2, a.postal_code,
    c.name, d.name,
    (
      select jsonb_agg(jsonb_build_object(
        'title', oi.title_snapshot,
        'quantity', oi.quantity,
        'lineTotal', oi.line_total,
        'coverPath', (
          select m.storage_path
          from public.book_images bi
          join public.media_assets m on m.id = bi.media_id
          where bi.book_id = oi.book_id
          order by bi.is_primary desc, bi.sort_order
          limit 1
        )
      ) order by oi.id)
      from public.order_items oi where oi.order_id = o.id
    )
  from public.orders o
  join public.addresses a on a.id = o.shipping_address_id
  left join public.shipping_cities c on c.id = a.city_id
  left join public.shipping_districts d on d.id = c.district_id
  where o.customer_id is null
    -- the current number OR the number this order had before it was renumbered
    and (o.order_number = p_order_number or o.previous_order_number = p_order_number)
    and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 9
    and public.phone_tail9(a.phone) = public.phone_tail9(p_phone);
$$;

revoke execute on function public.track_guest_order(text, text) from public;
grant execute on function public.track_guest_order(text, text) to anon, authenticated;
