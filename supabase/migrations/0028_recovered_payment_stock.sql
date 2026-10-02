-- 0028_recovered_payment_stock.sql
--
-- A Bank IPG payment retry can succeed after an earlier attempt on the same
-- order declined. The decline already released the order's stock
-- reservation, so commit_reserved_stock() (which also subtracts from
-- quantity_reserved) can't be used when the order is reinstated — it would
-- drive quantity_reserved negative. This sells straight from on-hand
-- instead, floored at zero because the customer has already paid and the
-- order must be honoured either way. Untracked products log a zero-delta
-- movement, same as commit_reserved_stock(). Not granted to anon or
-- authenticated: only the service-role return handler calls it.

create or replace function public.commit_stock_for_recovered_payment(p_book_id uuid, p_quantity int, p_order_id uuid)
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
      values (p_book_id, 'sale', 0, p_order_id, 'Untracked product — recovered payment, no quantity enforced');
    return;
  end if;

  update public.inventory
    set quantity_on_hand = greatest(quantity_on_hand - p_quantity, 0),
        updated_at = now()
    where book_id = p_book_id;

  insert into public.stock_movements (book_id, movement_type, quantity_delta, reference_order_id, note)
    values (p_book_id, 'sale', -p_quantity, p_order_id, 'Order confirmed (recovered payment retry)');
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.commit_stock_for_recovered_payment(uuid, int, uuid) from public;
