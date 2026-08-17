-- 0003_rls_policies.sql
-- Row-Level Security is the primary authorization mechanism in this
-- platform (see docs/architecture.md §4). Every customer-facing table is
-- locked down by default; policies open the minimum necessary access.

-- ---------------------------------------------------------------------
-- Helper: is the current JWT a staff member, and with which role?
-- ---------------------------------------------------------------------
create or replace function public.current_staff_role()
returns staff_role as $$
  select role from public.staff_members where id = auth.uid();
$$ language sql stable security definer;

create or replace function public.is_staff()
returns boolean as $$
  select exists (select 1 from public.staff_members where id = auth.uid());
$$ language sql stable security definer;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_self_read" on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and is_blocked = (select is_blocked from public.profiles where id = auth.uid()));
create policy "profiles_staff_manage" on public.profiles
  for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- addresses
-- ---------------------------------------------------------------------
alter table public.addresses enable row level security;

create policy "addresses_owner_all" on public.addresses
  for all using (customer_id = auth.uid() or public.is_staff())
  with check (customer_id = auth.uid() or public.is_staff());

-- ---------------------------------------------------------------------
-- catalog: public read, staff write
-- ---------------------------------------------------------------------
alter table public.authors enable row level security;
alter table public.publishers enable row level security;
alter table public.categories enable row level security;
alter table public.books enable row level security;
alter table public.book_categories enable row level security;
alter table public.book_images enable row level security;
alter table public.media_assets enable row level security;

create policy "authors_public_read" on public.authors for select using (true);
create policy "authors_staff_write" on public.authors for insert with check (public.is_staff());
create policy "authors_staff_update" on public.authors for update using (public.is_staff());
create policy "authors_staff_delete" on public.authors for delete using (public.is_staff());

create policy "publishers_public_read" on public.publishers for select using (true);
create policy "publishers_staff_write" on public.publishers for insert with check (public.is_staff());
create policy "publishers_staff_update" on public.publishers for update using (public.is_staff());
create policy "publishers_staff_delete" on public.publishers for delete using (public.is_staff());

create policy "categories_public_read" on public.categories for select using (true);
create policy "categories_staff_write" on public.categories for insert with check (public.is_staff());
create policy "categories_staff_update" on public.categories for update using (public.is_staff());
create policy "categories_staff_delete" on public.categories for delete using (public.is_staff());

create policy "books_public_read" on public.books for select using (is_active = true or public.is_staff());
create policy "books_staff_write" on public.books for insert with check (public.is_staff());
create policy "books_staff_update" on public.books for update using (public.is_staff());
create policy "books_staff_delete" on public.books for delete using (public.is_staff());

create policy "book_categories_public_read" on public.book_categories for select using (true);
create policy "book_categories_staff_write" on public.book_categories for all using (public.is_staff()) with check (public.is_staff());

create policy "book_images_public_read" on public.book_images for select using (true);
create policy "book_images_staff_write" on public.book_images for all using (public.is_staff()) with check (public.is_staff());

create policy "media_public_read" on public.media_assets for select using (true);
create policy "media_staff_write" on public.media_assets for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- inventory & stock movements: staff only
-- ---------------------------------------------------------------------
alter table public.inventory enable row level security;
alter table public.stock_movements enable row level security;

create policy "inventory_staff_only" on public.inventory for all using (public.is_staff()) with check (public.is_staff());
create policy "stock_movements_staff_only" on public.stock_movements for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- shipping config: public read (needed at checkout), staff write
-- ---------------------------------------------------------------------
alter table public.shipping_districts enable row level security;
alter table public.shipping_cities enable row level security;
alter table public.shipping_weight_bands enable row level security;
alter table public.shipping_rates enable row level security;

create policy "shipping_districts_public_read" on public.shipping_districts for select using (true);
create policy "shipping_districts_staff_write" on public.shipping_districts for all using (public.is_staff()) with check (public.is_staff());
create policy "shipping_cities_public_read" on public.shipping_cities for select using (true);
create policy "shipping_cities_staff_write" on public.shipping_cities for all using (public.is_staff()) with check (public.is_staff());
create policy "shipping_bands_public_read" on public.shipping_weight_bands for select using (true);
create policy "shipping_bands_staff_write" on public.shipping_weight_bands for all using (public.is_staff()) with check (public.is_staff());
create policy "shipping_rates_public_read" on public.shipping_rates for select using (true);
create policy "shipping_rates_staff_write" on public.shipping_rates for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- coupons: public read of active codes (needed to validate at checkout via RPC only,
-- not by browsing the table); staff manage
-- ---------------------------------------------------------------------
alter table public.coupons enable row level security;
alter table public.coupon_books enable row level security;
alter table public.coupon_categories enable row level security;
alter table public.coupon_redemptions enable row level security;

create policy "coupons_staff_only" on public.coupons for all using (public.is_staff()) with check (public.is_staff());
create policy "coupon_books_staff_only" on public.coupon_books for all using (public.is_staff()) with check (public.is_staff());
create policy "coupon_categories_staff_only" on public.coupon_categories for all using (public.is_staff()) with check (public.is_staff());
create policy "coupon_redemptions_owner_read" on public.coupon_redemptions for select using (customer_id = auth.uid() or public.is_staff());
-- Note: coupon validation/redemption happens exclusively through the
-- security-definer function validate_and_redeem_coupon(), never direct writes.

-- ---------------------------------------------------------------------
-- orders: customer sees own orders, staff sees all
-- ---------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

create policy "orders_owner_read" on public.orders for select using (customer_id = auth.uid() or public.is_staff());
create policy "orders_owner_insert" on public.orders for insert with check (customer_id = auth.uid() or public.is_staff());
create policy "orders_staff_update" on public.orders for update using (public.is_staff());

create policy "order_items_owner_read" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_staff()))
);
-- Customers may only insert line items into an order they own (their own
-- checkout flow, right after creating the order row); staff can insert
-- for any order (manual order creation/adjustment in the admin panel).
create policy "order_items_owner_insert" on public.order_items for insert with check (
  public.is_staff()
  or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
);
create policy "order_status_history_owner_read" on public.order_status_history for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_staff()))
);
create policy "order_status_history_staff_write" on public.order_status_history for insert with check (public.is_staff());

-- ---------------------------------------------------------------------
-- payments: owner + staff read, writes via service role only (webhooks)
-- ---------------------------------------------------------------------
alter table public.payment_providers enable row level security;
alter table public.payment_transactions enable row level security;

create policy "payment_providers_public_read" on public.payment_providers for select using (is_enabled = true or public.is_staff());
create policy "payment_providers_staff_write" on public.payment_providers for all using (public.is_staff()) with check (public.is_staff());
create policy "payment_transactions_owner_read" on public.payment_transactions for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_staff()))
);

-- ---------------------------------------------------------------------
-- reviews: public reads approved, owner manages own, staff moderates
-- ---------------------------------------------------------------------
alter table public.reviews enable row level security;

create policy "reviews_public_read_approved" on public.reviews for select using (status = 'approved' or customer_id = auth.uid() or public.is_staff());
create policy "reviews_owner_insert" on public.reviews for insert with check (customer_id = auth.uid());
create policy "reviews_owner_update_own_pending" on public.reviews for update using (customer_id = auth.uid() and status = 'pending');
create policy "reviews_staff_moderate" on public.reviews for update using (public.is_staff());
create policy "reviews_staff_delete" on public.reviews for delete using (public.is_staff());

-- ---------------------------------------------------------------------
-- wishlist: owner only
-- ---------------------------------------------------------------------
alter table public.wishlist_items enable row level security;
create policy "wishlist_owner_all" on public.wishlist_items for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- ---------------------------------------------------------------------
-- content: public read published, staff manage
-- ---------------------------------------------------------------------
alter table public.blog_posts enable row level security;
alter table public.static_pages enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.homepage_section_items enable row level security;

create policy "blog_public_read_published" on public.blog_posts for select using (is_published = true or public.is_staff());
create policy "blog_staff_write" on public.blog_posts for all using (public.is_staff()) with check (public.is_staff());

create policy "pages_public_read" on public.static_pages for select using (true);
create policy "pages_staff_write" on public.static_pages for all using (public.is_staff()) with check (public.is_staff());

create policy "homepage_public_read_visible" on public.homepage_sections for select using (is_visible = true or public.is_staff());
create policy "homepage_staff_write" on public.homepage_sections for all using (public.is_staff()) with check (public.is_staff());
create policy "homepage_items_public_read" on public.homepage_section_items for select using (is_visible = true or public.is_staff());
create policy "homepage_items_staff_write" on public.homepage_section_items for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- platform: staff-only visibility
-- ---------------------------------------------------------------------
alter table public.audit_logs enable row level security;
alter table public.system_logs enable row level security;
alter table public.url_redirects enable row level security;
alter table public.newsletter_subscribers enable row level security;

create policy "audit_logs_staff_read" on public.audit_logs for select using (public.is_staff());
create policy "system_logs_staff_read" on public.system_logs for select using (public.is_staff());
create policy "url_redirects_public_read" on public.url_redirects for select using (true);
create policy "url_redirects_staff_write" on public.url_redirects for all using (public.is_staff()) with check (public.is_staff());
create policy "newsletter_staff_read" on public.newsletter_subscribers for select using (public.is_staff());
create policy "newsletter_public_insert" on public.newsletter_subscribers for insert with check (true);
