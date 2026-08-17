-- 0010_payment_transactions_policy.sql
-- payment_transactions had a read policy but no insert policy — the
-- Bank IPG checkout flow (src/lib/payments/actions.ts) needs to record a
-- pending transaction for the customer's own order before redirecting to
-- the gateway. Webhook confirmations bypass RLS entirely via the
-- service-role client (src/app/api/webhooks/bank-ipg), so this policy only
-- needs to cover the customer-initiated "pending" row.

create policy "payment_transactions_owner_insert" on public.payment_transactions for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
);

-- ---------------------------------------------------------------------
-- Contact form submissions (the "Contact Us" storefront page).
-- ---------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
create policy "contact_messages_public_insert" on public.contact_messages for insert with check (true);
create policy "contact_messages_staff_read" on public.contact_messages for select using (public.is_staff());
create policy "contact_messages_staff_update" on public.contact_messages for update using (public.is_staff());
