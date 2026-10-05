-- 0030_track_guest_order_phone_variants.sql
--
-- Guest order tracking compared phone numbers by their digits, but required
-- the digits to be IDENTICAL. Sri Lankan numbers are written several ways for
-- the same line, so a customer who typed their number one way at checkout and
-- another way when tracking got "No matching order found":
--
--   0773967721        local format: a leading 0 + 9 digits
--   773967721         the 9 digits alone
--   94773967721       country code, no plus
--   +94 77 396 7721   country code with a plus and spaces
--
-- All of those are the same phone. Every valid Sri Lankan number is exactly 9
-- significant digits after the leading 0 or the 94 country code, so comparing
-- the LAST 9 DIGITS matches every variant and can't confuse two different
-- numbers. At least 9 digits must be supplied, so a short fragment can never
-- match by accident.
--
-- Only the phone comparison changes: the rest of track_guest_order() is
-- exactly as defined in 0021_guest_order_covers.sql. It is still scoped to
-- guest orders (customer_id is null).

create or replace function public.phone_tail9(p_phone text)
returns text
language sql
immutable
set search_path = public
as $$
  select right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
$$;

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
    and o.order_number = p_order_number
    -- Same phone however it was written: compare the last 9 digits, and
    -- require the caller to have supplied at least 9.
    and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 9
    and public.phone_tail9(a.phone) = public.phone_tail9(p_phone);
$$;

revoke execute on function public.track_guest_order(text, text) from public;
grant execute on function public.track_guest_order(text, text) to anon, authenticated;
