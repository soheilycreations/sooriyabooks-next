-- 0021_guest_order_covers.sql
-- Adds each item's cover image storage path to track_guest_order()'s
-- output, for the order-confirmation "packing" animation (see
-- src/components/storefront/order-pack-animation.tsx). Only the storage
-- path is returned — resolving it to a public URL stays entirely in
-- TypeScript (resolveCoverUrl in src/lib/catalog/queries.ts), same as
-- every other cover lookup in the app, rather than hardcoding the storage
-- bucket URL shape into SQL.

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
    and regexp_replace(a.phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g');
$$;

revoke execute on function public.track_guest_order(text, text) from public;
grant execute on function public.track_guest_order(text, text) to anon, authenticated;
