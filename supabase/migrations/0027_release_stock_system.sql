-- 0027_release_stock_system.sql
--
-- release_reserved_stock() requires v_order_owner = auth.uid() — correct
-- for a logged-in customer cancelling their own order, but that check
-- can never pass from a server-to-server context with no user session at
-- all (auth.uid() is null there), which is exactly what the Bank IPG
-- return handler and the checkout/return (cancelUrl) page are: Paycorp's
-- browser POST-back or redirect, not an authenticated customer request.
-- Concretely, this meant a declined/abandoned card payment never released
-- its stock reservation — the units stayed locked as "reserved" forever.
--
-- Same fix as commit_reserved_stock() already uses for the mirror-image
-- problem on the success path: a SECURITY DEFINER function with no
-- ownership check of its own, not granted to anon/authenticated, so it's
-- only reachable via the service-role client (or another SECURITY DEFINER
-- function) — i.e. only from code that has already established this is a
-- legitimate system-initiated release, not a customer request.

create or replace function public.release_reserved_stock_system(p_book_id uuid, p_quantity int, p_order_id uuid)
returns void as $$
begin
  update public.inventory
    set quantity_reserved = greatest(quantity_reserved - p_quantity, 0),
        updated_at = now()
    where book_id = p_book_id;

  insert into public.stock_movements (book_id, movement_type, quantity_delta, reference_order_id, note)
    values (p_book_id, 'release_reservation', p_quantity, p_order_id, 'Reservation released (system)');
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.release_reserved_stock_system(uuid, int, uuid) from public;
