-- 0031_expire_unpaid_card_orders.sql
--
-- A card (bank_ipg) order is created in 'pending_payment' with its stock
-- reserved, and only the Bank IPG return callback ever moves it on. When a
-- customer abandons the Sampath page (closes the tab, loses signal) no callback
-- arrives, so the order sits in 'pending_payment' forever and the reservation
-- locks those units. This expires such orders automatically.
--
-- Runs inside the database via pg_cron, so it doesn't depend on the Cloudflare
-- Worker being invoked. Needs the pg_cron extension (available on the Supabase
-- Pro plan; enabled below if it isn't already).
--
-- Rules: a bank_ipg order still 'pending_payment' after 60 minutes becomes
-- status 'cancelled' / payment_status 'failed', its reserved stock is released,
-- and an order_status_history row "Payment not completed in time" is written.
-- No emails are sent.
--
-- Idempotent: only orders still in 'pending_payment' are touched, and each is
-- flipped in the same transaction that releases its stock, so an order is
-- released exactly once however often this runs. Locked rows are skipped
-- (FOR UPDATE SKIP LOCKED), so it never fights a return callback that is
-- updating the same order; that order is simply picked up on the next run.

create or replace function public.expire_unpaid_card_orders(p_max_age interval default interval '60 minutes')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item record;
  v_count integer := 0;
begin
  for v_order in
    select id
    from public.orders
    where payment_method = 'bank_ipg'
      and status = 'pending_payment'
      and placed_at < now() - p_max_age
    order by placed_at
    for update skip locked
  loop
    -- One sub-transaction per order: if releasing one order's stock fails,
    -- only that order is rolled back and retried next run, not the whole batch.
    begin
      update public.orders
        set status = 'cancelled', payment_status = 'failed', updated_at = now()
        where id = v_order.id;

      insert into public.order_status_history (order_id, status, note)
        values (v_order.id, 'cancelled', 'Payment not completed in time');

      -- Only books that track stock ever had a quantity reserved; untracked
      -- books reserved nothing (reserve_stock logs a zero-quantity movement),
      -- so releasing them would log a bogus release and could subtract from
      -- other orders' reservations.
      for v_item in
        select oi.book_id, oi.quantity
        from public.order_items oi
        join public.inventory i on i.book_id = oi.book_id and i.stock_tracking_enabled
        where oi.order_id = v_order.id
      loop
        perform public.release_reserved_stock_system(v_item.book_id, v_item.quantity, v_order.id);
      end loop;

      v_count := v_count + 1;
    exception when others then
      raise warning 'expire_unpaid_card_orders: order % skipped: %', v_order.id, sqlerrm;
    end;
  end loop;

  return v_count;
end;
$$;

-- Only the database itself (pg_cron, or you in the SQL editor) may run this;
-- it must never be callable through the public API.
revoke execute on function public.expire_unpaid_card_orders(interval) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Schedule: every 15 minutes. Re-running this migration replaces the job
-- instead of creating a duplicate.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid) from cron.job where jobname = 'expire-unpaid-card-orders';

select cron.schedule(
  'expire-unpaid-card-orders',
  '*/15 * * * *',
  $cron$select public.expire_unpaid_card_orders()$cron$
);
