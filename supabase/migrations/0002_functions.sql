-- 0002_functions.sql
-- Core business-logic functions. These are the single source of truth for
-- rules that must never disagree between "what the UI quoted" and
-- "what actually got charged/decremented" under concurrent access.
--
-- SECURITY NOTE: Postgres grants EXECUTE on new functions to PUBLIC by
-- default. Every SECURITY DEFINER function below that touches
-- staff-only tables (inventory/stock_movements/coupons) explicitly
-- REVOKEs that default and re-grants only to `authenticated`, AND
-- validates that the calling user (auth.uid()) actually owns the
-- order/redemption in question before doing anything — otherwise any
-- logged-in customer could call it directly via RPC against someone
-- else's order_id and manipulate their stock or coupon usage.

-- ---------------------------------------------------------------------
-- Shipping: total cart weight + destination city -> price. Read-only,
-- safe to leave publicly callable (needed by anonymous cart pages too).
-- ---------------------------------------------------------------------
create or replace function public.calculate_shipping_cost(p_city_id uuid, p_total_weight_g int)
returns table (rate numeric, weight_band_id uuid) as $$
begin
  return query
    select r.price, r.weight_band_id
    from public.shipping_rates r
    join public.shipping_weight_bands b on b.id = r.weight_band_id
    where r.city_id = p_city_id
      and p_total_weight_g > b.min_weight_g
      and p_total_weight_g <= b.max_weight_g
    limit 1;
end;
$$ language plpgsql stable;

-- ---------------------------------------------------------------------
-- Inventory: atomic stock reservation at checkout start (prevents
-- overselling under concurrent checkouts). Fails loudly if insufficient
-- stock rather than allowing a negative on-hand count. Only callable for
-- an order the caller owns.
-- ---------------------------------------------------------------------
create or replace function public.reserve_stock(p_book_id uuid, p_quantity int, p_order_id uuid)
returns void as $$
declare
  v_available int;
  v_order_owner uuid;
begin
  select customer_id into v_order_owner from public.orders where id = p_order_id;
  if v_order_owner is distinct from auth.uid() then
    raise exception 'Not authorized for this order';
  end if;

  select (quantity_on_hand - quantity_reserved) into v_available
  from public.inventory where book_id = p_book_id
  for update;

  if v_available is null then
    raise exception 'No inventory row for book %', p_book_id;
  end if;

  if v_available < p_quantity then
    raise exception 'Insufficient stock for book % (available %, requested %)', p_book_id, v_available, p_quantity;
  end if;

  update public.inventory
    set quantity_reserved = quantity_reserved + p_quantity, updated_at = now()
    where book_id = p_book_id;

  insert into public.stock_movements (book_id, movement_type, quantity_delta, reference_order_id, note)
    values (p_book_id, 'reservation', -p_quantity, p_order_id, 'Reserved at checkout');
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.reserve_stock(uuid, int, uuid) from public;
grant execute on function public.reserve_stock(uuid, int, uuid) to authenticated;

-- Convert a reservation into a real sale. Not directly grantable to
-- customers (they go through confirm_cod_order() in 0005, which validates
-- ownership then calls this as the same SECURITY DEFINER context); staff
-- fulfil non-COD orders through the admin order-management flow, which
-- also goes through a dedicated function rather than calling this raw.
create or replace function public.commit_reserved_stock(p_book_id uuid, p_quantity int, p_order_id uuid)
returns void as $$
begin
  update public.inventory
    set quantity_on_hand = quantity_on_hand - p_quantity,
        quantity_reserved = quantity_reserved - p_quantity,
        updated_at = now()
    where book_id = p_book_id;

  insert into public.stock_movements (book_id, movement_type, quantity_delta, reference_order_id, note)
    values (p_book_id, 'sale', -p_quantity, p_order_id, 'Order confirmed');
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.commit_reserved_stock(uuid, int, uuid) from public;
-- Intentionally no grant to `authenticated` here: this function has no
-- ownership check of its own (it assumes the caller already validated
-- it, as confirm_cod_order() does). It's callable by the function owner
-- role (migrations/service role) and by other SECURITY DEFINER functions
-- in this schema, which is all that should ever call it directly.

-- Release a reservation (order cancelled/expired/payment failed). Same
-- ownership-check pattern as reserve_stock().
create or replace function public.release_reserved_stock(p_book_id uuid, p_quantity int, p_order_id uuid)
returns void as $$
declare
  v_order_owner uuid;
begin
  select customer_id into v_order_owner from public.orders where id = p_order_id;
  if v_order_owner is distinct from auth.uid() then
    raise exception 'Not authorized for this order';
  end if;

  update public.inventory
    set quantity_reserved = greatest(quantity_reserved - p_quantity, 0),
        updated_at = now()
    where book_id = p_book_id;

  insert into public.stock_movements (book_id, movement_type, quantity_delta, reference_order_id, note)
    values (p_book_id, 'release_reservation', p_quantity, p_order_id, 'Reservation released');
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.release_reserved_stock(uuid, int, uuid) from public;
grant execute on function public.release_reserved_stock(uuid, int, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Coupons: validate + atomically increment usage counter. Customer-callable,
-- but only ever redeems for p_customer_id = auth.uid() — enforced below,
-- not just trusted from the argument.
-- ---------------------------------------------------------------------
create or replace function public.validate_and_redeem_coupon(
  p_code citext, p_customer_id uuid, p_order_id uuid, p_order_subtotal numeric
) returns numeric as $$
declare
  v_coupon public.coupons%rowtype;
  v_customer_uses int;
  v_discount numeric;
  v_order_owner uuid;
begin
  if p_customer_id is distinct from auth.uid() then
    raise exception 'Not authorized';
  end if;

  select customer_id into v_order_owner from public.orders where id = p_order_id;
  if v_order_owner is distinct from auth.uid() then
    raise exception 'Not authorized for this order';
  end if;

  select * into v_coupon from public.coupons where code = p_code for update;

  if not found or not v_coupon.is_active then
    raise exception 'Invalid coupon code';
  end if;
  if v_coupon.starts_at is not null and now() < v_coupon.starts_at then
    raise exception 'Coupon not yet active';
  end if;
  if v_coupon.expires_at is not null and now() > v_coupon.expires_at then
    raise exception 'Coupon expired';
  end if;
  if v_coupon.usage_limit is not null and v_coupon.usage_count >= v_coupon.usage_limit then
    raise exception 'Coupon usage limit reached';
  end if;
  if p_order_subtotal < coalesce(v_coupon.minimum_order_amount, 0) then
    raise exception 'Order does not meet minimum amount for this coupon';
  end if;
  if v_coupon.per_customer_limit is not null then
    select count(*) into v_customer_uses from public.coupon_redemptions
      where coupon_id = v_coupon.id and customer_id = p_customer_id;
    if v_customer_uses >= v_coupon.per_customer_limit then
      raise exception 'Coupon usage limit reached for this customer';
    end if;
  end if;

  v_discount := case v_coupon.type
    when 'percentage' then round(p_order_subtotal * (v_coupon.value / 100), 2)
    else v_coupon.value
  end;
  v_discount := least(v_discount, p_order_subtotal);

  update public.coupons set usage_count = usage_count + 1 where id = v_coupon.id;
  insert into public.coupon_redemptions (coupon_id, customer_id, order_id) values (v_coupon.id, p_customer_id, p_order_id);

  return v_discount;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.validate_and_redeem_coupon(citext, uuid, uuid, numeric) from public;
grant execute on function public.validate_and_redeem_coupon(citext, uuid, uuid, numeric) to authenticated;

-- ---------------------------------------------------------------------
-- Order confirmation (Cash on Delivery): customer-owned order,
-- pending_payment -> confirmed, committing reserved stock. Safe to expose
-- broadly because it fully validates ownership/state itself.
-- ---------------------------------------------------------------------
create or replace function public.confirm_cod_order(p_order_id uuid)
returns void as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  select * into v_order from public.orders where id = p_order_id;

  if not found then
    raise exception 'Order not found';
  end if;
  if v_order.customer_id is distinct from auth.uid() then
    raise exception 'Not authorized for this order';
  end if;
  if v_order.payment_method <> 'cod' then
    raise exception 'This function only confirms Cash on Delivery orders';
  end if;
  if v_order.status <> 'pending_payment' then
    raise exception 'Order is not awaiting confirmation';
  end if;

  for v_item in select book_id, quantity from public.order_items where order_id = p_order_id loop
    perform public.commit_reserved_stock(v_item.book_id, v_item.quantity, p_order_id);
  end loop;

  update public.orders set status = 'confirmed' where id = p_order_id;

  insert into public.order_status_history (order_id, status, note)
    values (p_order_id, 'confirmed', 'Order placed with Cash on Delivery');
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.confirm_cod_order(uuid) from public;
grant execute on function public.confirm_cod_order(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Order numbering: human-friendly sequential number per year, e.g. SB-2027-000123
-- Safe to leave publicly callable — it has no side effect beyond
-- consuming a sequence value, and only authenticated users ever reach the
-- checkout flow that calls it.
-- ---------------------------------------------------------------------
create sequence if not exists public.order_number_seq;

create or replace function public.next_order_number()
returns text as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_seq bigint := nextval('public.order_number_seq');
begin
  return 'SB-' || v_year || '-' || lpad(v_seq::text, 6, '0');
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- updated_at maintenance trigger, applied to every table that has the column
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t
    );
  end loop;
end;
$$;
