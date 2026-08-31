-- 0022_bank_transfer_payment.sql
-- Adds "Direct Bank Transfer" as a payment method — the legacy site's
-- other real gateway alongside Sampath's Paycorp IPG
-- (woocommerce_bacs_settings, enabled). No external API: the customer
-- transfers manually and sends proof via WhatsApp/email (see the
-- instructions text in checkout-form.tsx), and staff confirm the order
-- manually once the funds clear — same as how confirm_cod_order() exists
-- for Cash on Delivery, this one has no equivalent auto-confirm function
-- on purpose; the order stays pending_payment until a staff member acts.
--
-- ALTER TYPE ... ADD VALUE only adds the label here; nothing in this
-- migration uses the new value, so it's safe to commit in its own
-- transaction (Postgres can't use a just-added enum value in the same
-- transaction that added it).

alter type payment_method add value 'bank_transfer';

insert into public.payment_providers (id, display_name, is_enabled, sort_order, config)
values ('bank_transfer', 'Direct Bank Transfer', true, 3, '{}'::jsonb)
on conflict (id) do nothing;
