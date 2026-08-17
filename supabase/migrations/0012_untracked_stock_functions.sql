-- 0012_untracked_stock_functions.sql
--
-- Redefines reserve_stock/commit_reserved_stock/release_reserved_stock
-- (originally from 0002_functions.sql) to branch on
-- inventory.stock_tracking_enabled. Untracked products never touch
-- quantity_on_hand/quantity_reserved — no fabricated numbers are ever
-- decremented — and are gated purely by untracked_available. A
-- zero-delta stock_movements row is still logged for untracked
-- reservations/commits/releases so the audit trail shows the order
-- touched that product, without implying a real quantity changed.
--
-- Same security model as the originals: SECURITY DEFINER, PUBLIC execute
-- revoked, ownership-checked against auth.uid() where the caller is a
-- customer (reserve_stock, release_reserved_stock). commit_reserved_stock
-- has no grant to `authenticated` — it's only ever called by other
-- SECURITY DEFINER functions (confirm_cod_order) or the service-role
-- webhook, matching 0002's original design.

create or replace function public.reserve_stock(p_book_id uuid, p_quantity int, p_order_id uuid)
returns void as $$
declare
  v_order_owner uuid;
  v_row public.inventory%rowtype;
  v_available int;
begin
  select customer_id into v_order_owner from public.orders where id = p_order_id;
  if v_order_owner is distinct from auth.uid() then
    raise exception 'Not authorized for this order';
  end if;

  select * into v_row from public.inventory where book_id = p_book_id for update;
  if not found then
    raise exception 'No inventory row for book %', p_book_id;
  end if;

  if not v_row.stock_tracking_enabled then
    if not v_row.untracked_available then
      raise exception 'Book % is not available', p_book_id;
    end if;
    insert into public.stock_movements (book_id, movement_type, quantity_delta, reference_order_id, note)
      values (p_book_id, 'reservation', 0, p_order_id, 'Untracked product — no quantity enforced');
    return;
  end if;

  v_available := v_row.quantity_on_hand - v_row.quantity_reserved;
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

create or replace function public.commit_reserved_stock(p_book_id uuid, p_quantity int, p_order_id uuid)
returns void as $$
declare
  v_tracking boolean;
begin
  select stock_tracking_enabled into v_tracking from public.inventory where book_id = p_book_id for update;
  if not found then
    raise exception 'No inventory row for book %', p_book_id;
  end if;

  if not v_tracking then
    insert into public.stock_movements (book_id, movement_type, quantity_delta, reference_order_id, note)
      values (p_book_id, 'sale', 0, p_order_id, 'Untracked product — no quantity enforced');
    return;
  end if;

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

create or replace function public.release_reserved_stock(p_book_id uuid, p_quantity int, p_order_id uuid)
returns void as $$
declare
  v_order_owner uuid;
  v_tracking boolean;
begin
  select customer_id into v_order_owner from public.orders where id = p_order_id;
  if v_order_owner is distinct from auth.uid() then
    raise exception 'Not authorized for this order';
  end if;

  select stock_tracking_enabled into v_tracking from public.inventory where book_id = p_book_id for update;
  if not found then
    raise exception 'No inventory row for book %', p_book_id;
  end if;

  if not v_tracking then
    insert into public.stock_movements (book_id, movement_type, quantity_delta, reference_order_id, note)
      values (p_book_id, 'release_reservation', 0, p_order_id, 'Untracked product — no quantity enforced');
    return;
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
