-- 0025_order_contact_email.sql
--
-- Order confirmation emails need a reliable place to read the buyer's
-- email from. It used to only ride along inside `customer_note` as free
-- text ("Contact email: x@y.com") — fine for a human reading the order in
-- admin, useless for code that needs to actually send an email. Adds a
-- real column and threads it through both checkout paths.

alter table public.orders add column if not exists contact_email text;

-- place_guest_order() gets a new p_contact_email param — added at the end
-- so this is a distinct overload from the old signature, not a silent
-- change to it; the old one is dropped explicitly below so there isn't a
-- stale duplicate left behind.
drop function if exists public.place_guest_order(
  text, text, text, text, uuid, text, payment_method, jsonb, citext, text
);

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
  p_customer_note text default null,
  p_contact_email text default null
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
    coupon_id, shipping_address_id, billing_address_id, total_weight_g, customer_note, contact_email
  ) values (
    v_order_number, null, 'pending_payment', p_payment_method, 'pending',
    v_subtotal, 0, v_shipping, 0, v_subtotal + v_shipping,
    v_coupon_id, v_address_id, v_address_id, v_total_weight, nullif(p_customer_note, ''), nullif(p_contact_email, '')
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
  text, text, text, text, uuid, text, payment_method, jsonb, citext, text, text
) from public;
grant execute on function public.place_guest_order(
  text, text, text, text, uuid, text, payment_method, jsonb, citext, text, text
) to anon, authenticated;
