-- 0019_guest_checkout.sql
--
-- Lets a customer place an order without an account. `orders.customer_id`
-- was already nullable; `addresses.customer_id` was not, so a guest's
-- delivery address had nowhere to go — fixed below.
--
-- Every write RLS needs for a normal checkout (addresses/orders/order_items
-- inserts, stock reservation, coupon redemption, COD confirmation) is keyed
-- to `customer_id = auth.uid()` with plain `=`, which is never true when
-- both sides are null (a guest has no auth.uid()) — so guest writes can't
-- go through the existing per-table RLS policies no matter what the app
-- code does. Rather than loosen those policies (which would apply to real
-- logged-in customers too), place_guest_order() below does the entire
-- checkout — re-pricing, address, order, order_items, stock reservation,
-- coupon, COD confirmation — as one SECURITY DEFINER transaction that
-- bypasses RLS the same way reserve_stock()/confirm_cod_order()/etc.
-- already do for the authenticated path. It calls those existing functions
-- directly rather than duplicating their logic; their own ownership checks
-- (`v_order_owner IS DISTINCT FROM auth.uid()`) already pass correctly for
-- a guest order, since a null customer_id and a null auth.uid() are not
-- distinct from each other.

alter table public.addresses alter column customer_id drop not null;

create or replace function public.place_guest_order(
  p_recipient_name text,
  p_phone text,
  p_line1 text,
  p_line2 text,
  p_city_id uuid,
  p_postal_code text,
  p_payment_method payment_method,
  p_items jsonb,                    -- [{ "bookId": uuid, "quantity": int }, ...]
  p_coupon_code citext default null,
  p_customer_note text default null
)
returns table (order_id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_address_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_book_id uuid;
  v_quantity int;
  v_book public.books%rowtype;
  v_unit_price numeric;
  v_subtotal numeric := 0;
  v_total_weight int := 0;
  v_shipping numeric;
  v_coupon_id uuid;
  v_discount numeric;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty';
  end if;

  -- 1. Re-price every item server-side — never trust client totals.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_book_id := (v_item ->> 'bookId')::uuid;
    v_quantity := (v_item ->> 'quantity')::int;
    if v_quantity is null or v_quantity < 1 then
      raise exception 'Invalid quantity';
    end if;

    select * into v_book from public.books where id = v_book_id;
    if not found or not v_book.is_active then
      raise exception 'One or more items in your cart are no longer available';
    end if;

    v_unit_price := case
      when v_book.discount_price is not null and v_book.discount_price < v_book.selling_price
      then v_book.discount_price else v_book.selling_price
    end;
    v_subtotal := v_subtotal + v_unit_price * v_quantity;
    v_total_weight := v_total_weight + v_book.weight_grams * v_quantity;
  end loop;

  -- 2. Shipping quote (calculate_shipping_cost is already public — see
  -- 0002_functions.sql).
  select rate into v_shipping from public.calculate_shipping_cost(p_city_id, v_total_weight) limit 1;
  if v_shipping is null then
    raise exception 'No delivery rate is configured for this city yet. Please contact us to complete your order.';
  end if;

  -- 3. Delivery address — guest, so customer_id stays null.
  insert into public.addresses (customer_id, recipient_name, phone, line1, line2, city_id, postal_code)
  values (null, p_recipient_name, p_phone, p_line1, nullif(p_line2, ''), p_city_id, nullif(p_postal_code, ''))
  returning id into v_address_id;

  -- 4. Coupon code -> id (validate_and_redeem_coupon does the real checks
  -- once the order exists, same two-step order as the authenticated path).
  if p_coupon_code is not null then
    select id into v_coupon_id from public.coupons where code = p_coupon_code;
    if v_coupon_id is null then
      raise exception 'Invalid coupon code';
    end if;
  end if;

  -- 5. Create the order.
  v_order_number := coalesce(public.next_order_number(), 'SB-' || extract(epoch from now())::bigint);

  insert into public.orders (
    order_number, customer_id, status, payment_method, payment_status,
    subtotal, discount_total, shipping_total, tax_total, grand_total,
    coupon_id, shipping_address_id, billing_address_id, total_weight_g, customer_note
  ) values (
    v_order_number, null, 'pending_payment', p_payment_method, 'pending',
    v_subtotal, 0, v_shipping, 0, v_subtotal + v_shipping,
    v_coupon_id, v_address_id, v_address_id, v_total_weight, nullif(p_customer_note, '')
  )
  returning id into v_order_id;

  -- 6. Coupon validation + redemption now that the order exists.
  if p_coupon_code is not null then
    v_discount := public.validate_and_redeem_coupon(p_coupon_code, null, v_order_id, v_subtotal);
    perform public.apply_order_coupon_discount(v_order_id, v_discount);
  end if;

  -- 7. Reserve stock per line item. A failure here RAISEs, which aborts
  -- and rolls back this whole function call — address, order, order_items,
  -- and any reservations already made in this loop all revert together.
  -- True transactional atomicity, unlike the authenticated TS path, which
  -- has to compensate manually across multiple round-trips.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_book_id := (v_item ->> 'bookId')::uuid;
    v_quantity := (v_item ->> 'quantity')::int;
    perform public.reserve_stock(v_book_id, v_quantity, v_order_id);
  end loop;

  -- 8. Order line items (price/weight snapshots, immutable history).
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_book_id := (v_item ->> 'bookId')::uuid;
    v_quantity := (v_item ->> 'quantity')::int;
    select * into v_book from public.books where id = v_book_id;
    v_unit_price := case
      when v_book.discount_price is not null and v_book.discount_price < v_book.selling_price
      then v_book.discount_price else v_book.selling_price
    end;

    insert into public.order_items (order_id, book_id, title_snapshot, sku_snapshot, unit_price, quantity, line_total)
    values (v_order_id, v_book_id, v_book.title, v_book.sku, v_unit_price, v_quantity, v_unit_price * v_quantity);
  end loop;

  -- 9. Cash on Delivery confirms immediately, same as the authenticated path.
  if p_payment_method = 'cod' then
    perform public.confirm_cod_order(v_order_id);
  end if;

  return query select v_order_id, v_order_number;
end;
$$;

revoke execute on function public.place_guest_order(
  text, text, text, text, uuid, text, payment_method, jsonb, citext, text
) from public;
grant execute on function public.place_guest_order(
  text, text, text, text, uuid, text, payment_method, jsonb, citext, text
) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Guest order tracking: a guest has no account to view /account/orders
-- with, so lookup is by order number + the phone number they gave at
-- checkout (loosely matched — digits only — so "071-234-5678" and
-- "0712345678" both work). Deliberately scoped to customer_id is null —
-- a logged-in customer's own orders are never reachable through this path,
-- they already have /account/orders.
-- ---------------------------------------------------------------------
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
        'title', oi.title_snapshot, 'quantity', oi.quantity, 'lineTotal', oi.line_total
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
