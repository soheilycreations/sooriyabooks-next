-- 0020_guest_bank_payment.sql
--
-- Bank IPG payment for a guest order (see 0019_guest_checkout.sql) hits the
-- same problem class again: `orders_owner_read` and
-- `payment_transactions_owner_insert` are both keyed to
-- `customer_id = auth.uid()` with plain `=`, which a guest can never
-- satisfy. Two narrow SECURITY DEFINER functions, scoped to
-- `customer_id is null` orders only — a logged-in customer's orders are
-- never reachable through these, they already have the normal RLS path in
-- src/lib/payments/actions.ts.

create or replace function public.get_guest_order_for_payment(p_order_id uuid)
returns table (order_id uuid, order_number text, grand_total numeric, payment_method payment_method)
language sql
security definer
set search_path = public
stable
as $$
  select id, order_number, grand_total, payment_method
  from public.orders
  where id = p_order_id and customer_id is null;
$$;

revoke execute on function public.get_guest_order_for_payment(uuid) from public;
grant execute on function public.get_guest_order_for_payment(uuid) to anon, authenticated;

create or replace function public.record_guest_payment_transaction(
  p_order_id uuid, p_provider_reference text, p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.orders where id = p_order_id and customer_id is null) then
    raise exception 'Order not found';
  end if;

  insert into public.payment_transactions (order_id, provider_id, provider_reference, amount, status)
  values (p_order_id, 'bank_ipg', p_provider_reference, p_amount, 'pending');
end;
$$;

revoke execute on function public.record_guest_payment_transaction(uuid, text, numeric) from public;
grant execute on function public.record_guest_payment_transaction(uuid, text, numeric) to anon, authenticated;
