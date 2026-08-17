-- 0007_order_mutation_functions.sql
--
-- Same problem class as confirm_cod_order() (0002/0006): the checkout
-- Server Action runs as the authenticated customer, but marking an order
-- failed and applying a coupon discount both write to `orders`, which is
-- staff-only under RLS. These two narrow SECURITY DEFINER functions let a
-- customer do exactly those two things, and only for an order they own.

create or replace function public.mark_order_failed(p_order_id uuid, p_note text default null)
returns void as $$
declare
  v_order_owner uuid;
begin
  select customer_id into v_order_owner from public.orders where id = p_order_id;
  if v_order_owner is distinct from auth.uid() then
    raise exception 'Not authorized for this order';
  end if;

  update public.orders set status = 'failed' where id = p_order_id;

  insert into public.order_status_history (order_id, status, note)
    values (p_order_id, 'failed', coalesce(p_note, 'Order failed during checkout'));
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.mark_order_failed(uuid, text) from public;
grant execute on function public.mark_order_failed(uuid, text) to authenticated;

create or replace function public.apply_order_coupon_discount(p_order_id uuid, p_discount numeric)
returns void as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found or v_order.customer_id is distinct from auth.uid() then
    raise exception 'Not authorized for this order';
  end if;
  if p_discount < 0 or p_discount > v_order.subtotal then
    raise exception 'Invalid discount amount';
  end if;

  update public.orders
    set discount_total = p_discount,
        grand_total = v_order.subtotal - p_discount + v_order.shipping_total + v_order.tax_total
    where id = p_order_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.apply_order_coupon_discount(uuid, numeric) from public;
grant execute on function public.apply_order_coupon_discount(uuid, numeric) to authenticated;
