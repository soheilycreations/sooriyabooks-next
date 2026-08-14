-- 0002_functions.sql
-- Core business-logic functions. These are the single source of truth for
-- rules that must never disagree between "what the UI quoted" and
-- "what actually got charged/decremented" under concurrent access.

-- ---------------------------------------------------------------------
-- Shipping: total cart weight + destination city -> price
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
-- stock rather than allowing a negative on-hand count.
-- ---------------------------------------------------------------------
create or replace function public.reserve_stock(p_book_id uuid, p_quantity int, p_order_id uuid)
returns void as $$
declare
  v_available int;
begin
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
$$ language plpgsql;

-- Convert a reservation into a real sale (on order confirmation).
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
$$ language plpgsql;

-- Release a reservation (order cancelled/expired/payment failed).
create or replace function public.release_reserved_stock(p_book_id uuid, p_quantity int, p_order_id uuid)
returns void as $$
begin
  update public.inventory
    set quantity_reserved = greatest(quantity_reserved - p_quantity, 0),
        updated_at = now()
    where book_id = p_book_id;

  insert into public.stock_movements (book_id, movement_type, quantity_delta, reference_order_id, note)
    values (p_book_id, 'release_reservation', p_quantity, p_order_id, 'Reservation released');
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- Coupons: validate + atomically increment usage counter
-- ---------------------------------------------------------------------
create or replace function public.validate_and_redeem_coupon(
  p_code citext, p_customer_id uuid, p_order_id uuid, p_order_subtotal numeric
) returns numeric as $$
declare
  v_coupon public.coupons%rowtype;
  v_customer_uses int;
  v_discount numeric;
begin
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
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- Order numbering: human-friendly sequential number per year, e.g. SB-2027-000123
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
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t
    );
  end loop;
end;
$$;
