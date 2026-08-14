-- SooriyaBooks Commerce Platform V2
-- 0001_init_schema.sql
-- Fully normalized PostgreSQL schema, designed from scratch for a bookstore.
-- No WordPress/WooCommerce tables or naming conventions are reused.

create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;   -- fuzzy/full-text search support
create extension if not exists citext;    -- case-insensitive emails/SKUs

-- =========================================================================
-- ENUMS
-- =========================================================================

create type staff_role as enum ('admin', 'manager', 'editor');
create type order_status as enum (
  'pending_payment', 'processing', 'confirmed', 'packed',
  'shipped', 'delivered', 'cancelled', 'refunded', 'failed'
);
create type payment_status as enum ('pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded');
create type payment_method as enum ('cod', 'bank_ipg');
create type stock_movement_type as enum (
  'restock', 'sale', 'return', 'manual_adjustment', 'reservation', 'release_reservation', 'damaged'
);
create type coupon_type as enum ('percentage', 'fixed');
create type coupon_scope as enum ('all', 'book', 'category');
create type review_status as enum ('pending', 'approved', 'rejected');
create type media_kind as enum ('image', 'document');
create type homepage_section_type as enum (
  'hero_slider', 'promo_banner', 'featured_books', 'new_arrivals',
  'best_sellers', 'featured_authors', 'featured_publishers', 'offer_section', 'popup_banner'
);

-- =========================================================================
-- IDENTITY  (auth.users is Supabase-managed; these extend it)
-- =========================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  is_blocked boolean not null default false,   -- generalizes the old "Blocked Users" snippet
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_members (
  id uuid primary key references auth.users(id) on delete cascade,
  role staff_role not null,
  created_at timestamptz not null default now()
);

-- NOTE: public.addresses references shipping_cities and is created further
-- below (after the shipping engine tables) to satisfy FK ordering.

-- =========================================================================
-- CATALOG: authors, publishers, categories, books
-- =========================================================================

create table public.authors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug citext not null unique,
  bio text,
  photo_url text,
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.publishers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug citext not null unique,
  description text,
  logo_url text,
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug citext not null unique,
  description text,
  image_url text,
  sort_order int not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.categories (parent_id);

create table public.books (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  subtitle text,
  slug citext not null unique,
  isbn citext unique,
  sku citext not null unique,
  author_id uuid references public.authors(id) on delete set null,
  publisher_id uuid references public.publishers(id) on delete set null,
  language text not null default 'English',
  edition text,
  page_count int,
  weight_grams int not null,                    -- drives the shipping engine
  description text,
  short_description text,
  selling_price numeric(12,2) not null check (selling_price >= 0),
  discount_price numeric(12,2) check (discount_price is null or discount_price >= 0),
  is_featured boolean not null default false,
  is_new_arrival boolean not null default false,
  is_best_seller boolean not null default false,
  is_active boolean not null default true,       -- publish/unpublish
  seo_title text,
  seo_description text,
  seo_canonical_url text,
  og_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_below_selling check (discount_price is null or discount_price <= selling_price)
);
create index on public.books (author_id);
create index on public.books (publisher_id);
create index on public.books (is_active);
create index books_title_trgm_idx on public.books using gin (title gin_trgm_ops);
create index books_search_idx on public.books using gin (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(subtitle,'') || ' ' || coalesce(isbn,''))
);

create table public.book_categories (
  book_id uuid not null references public.books(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (book_id, category_id)
);

create table public.media_assets (
  id uuid primary key default uuid_generate_v4(),
  kind media_kind not null default 'image',
  storage_path text not null,                    -- Supabase Storage object path
  alt_text text,
  width int,
  height int,
  uploaded_by uuid references public.staff_members(id),
  created_at timestamptz not null default now()
);

create table public.book_images (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references public.books(id) on delete cascade,
  media_id uuid not null references public.media_assets(id) on delete cascade,
  is_primary boolean not null default false,
  sort_order int not null default 0
);
create index on public.book_images (book_id);

-- =========================================================================
-- INVENTORY
-- =========================================================================

create table public.inventory (
  book_id uuid primary key references public.books(id) on delete cascade,
  quantity_on_hand int not null default 0 check (quantity_on_hand >= 0),
  quantity_reserved int not null default 0 check (quantity_reserved >= 0),
  low_stock_threshold int not null default 5,
  updated_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references public.books(id) on delete cascade,
  movement_type stock_movement_type not null,
  quantity_delta int not null,                    -- signed
  reference_order_id uuid,                          -- nullable FK added after orders table exists
  note text,
  performed_by uuid references public.staff_members(id),
  created_at timestamptz not null default now()
);
create index on public.stock_movements (book_id, created_at desc);

-- =========================================================================
-- SHIPPING ENGINE  (district -> city -> weight band -> price)
-- =========================================================================

create table public.shipping_districts (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  sort_order int not null default 0
);

create table public.shipping_cities (
  id uuid primary key default uuid_generate_v4(),
  district_id uuid not null references public.shipping_districts(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  unique (district_id, name)
);
create index on public.shipping_cities (district_id);

create table public.shipping_weight_bands (
  id uuid primary key default uuid_generate_v4(),
  min_weight_g int not null check (min_weight_g >= 0),
  max_weight_g int not null,
  label text,
  constraint band_order check (max_weight_g > min_weight_g)
);

create table public.shipping_rates (
  id uuid primary key default uuid_generate_v4(),
  city_id uuid not null references public.shipping_cities(id) on delete cascade,
  weight_band_id uuid not null references public.shipping_weight_bands(id) on delete cascade,
  price numeric(10,2) not null check (price >= 0),
  updated_at timestamptz not null default now(),
  unique (city_id, weight_band_id)
);

create table public.addresses (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  label text,                                  -- "Home", "Office"
  recipient_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city_id uuid not null references public.shipping_cities(id),
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.addresses (customer_id);

-- =========================================================================
-- COUPONS
-- =========================================================================

create table public.coupons (
  id uuid primary key default uuid_generate_v4(),
  code citext not null unique,
  type coupon_type not null,
  value numeric(10,2) not null check (value > 0),
  scope coupon_scope not null default 'all',
  minimum_order_amount numeric(12,2) default 0,
  usage_limit int,                                 -- null = unlimited
  usage_count int not null default 0,
  per_customer_limit int,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.coupon_books (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  primary key (coupon_id, book_id)
);

create table public.coupon_categories (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (coupon_id, category_id)
);

create table public.coupon_redemptions (
  id uuid primary key default uuid_generate_v4(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  customer_id uuid references public.profiles(id),
  order_id uuid,                                    -- FK added after orders table exists
  redeemed_at timestamptz not null default now()
);

-- =========================================================================
-- ORDERS
-- =========================================================================

create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique,                -- human-friendly, e.g. SB-2027-000123
  customer_id uuid references public.profiles(id),
  status order_status not null default 'pending_payment',
  payment_method payment_method not null,
  payment_status payment_status not null default 'pending',
  subtotal numeric(12,2) not null,
  discount_total numeric(12,2) not null default 0,
  shipping_total numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null,
  coupon_id uuid references public.coupons(id),
  shipping_address_id uuid references public.addresses(id),
  billing_address_id uuid references public.addresses(id),
  total_weight_g int not null,
  customer_note text,
  admin_note text,
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.orders (customer_id);
create index on public.orders (status);
create index on public.orders (placed_at desc);

create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  book_id uuid references public.books(id) on delete set null,
  title_snapshot text not null,                     -- preserve historical title/price even if book changes later
  sku_snapshot text not null,
  unit_price numeric(12,2) not null,
  quantity int not null check (quantity > 0),
  line_total numeric(12,2) not null
);
create index on public.order_items (order_id);

create table public.order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status order_status not null,
  note text,
  changed_by uuid references public.staff_members(id),
  changed_at timestamptz not null default now()
);

alter table public.stock_movements
  add constraint stock_movements_order_fk foreign key (reference_order_id) references public.orders(id) on delete set null;
alter table public.coupon_redemptions
  add constraint coupon_redemptions_order_fk foreign key (order_id) references public.orders(id) on delete set null;

-- =========================================================================
-- PAYMENTS  (pluggable provider model)
-- =========================================================================

create table public.payment_providers (
  id text primary key,                              -- 'cod' | 'bank_ipg' | future providers
  display_name text not null,
  is_enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,          -- non-secret settings only
  sort_order int not null default 0
);

create table public.payment_transactions (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider_id text not null references public.payment_providers(id),
  provider_reference text,
  amount numeric(12,2) not null,
  status payment_status not null,
  raw_response jsonb,
  created_at timestamptz not null default now()
);
create index on public.payment_transactions (order_id);

-- =========================================================================
-- REVIEWS & WISHLIST
-- =========================================================================

create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references public.books(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  order_item_id uuid references public.order_items(id),   -- non-null => verified purchase
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text,
  status review_status not null default 'pending',
  staff_reply text,
  staff_replied_by uuid references public.staff_members(id),
  staff_replied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (book_id, customer_id, order_item_id)
);
create index on public.reviews (book_id, status);

create table public.wishlist_items (
  customer_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (customer_id, book_id)
);

-- =========================================================================
-- CONTENT: blog, homepage sections, static pages
-- =========================================================================

create table public.blog_posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug citext not null unique,
  excerpt text,
  body text not null,
  cover_media_id uuid references public.media_assets(id),
  author_staff_id uuid references public.staff_members(id),
  is_published boolean not null default false,
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.static_pages (
  id uuid primary key default uuid_generate_v4(),
  slug citext not null unique,                       -- 'about', 'privacy', 'terms', 'contact'
  title text not null,
  body text not null,
  seo_title text,
  seo_description text,
  updated_at timestamptz not null default now()
);

-- Admin-managed homepage — fixed section types, no drag-and-drop page builder.
create table public.homepage_sections (
  id uuid primary key default uuid_generate_v4(),
  type homepage_section_type not null,
  title text,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  config jsonb not null default '{}'::jsonb,          -- section-specific structured content
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homepage_section_items (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid not null references public.homepage_sections(id) on delete cascade,
  image_media_id uuid references public.media_assets(id),
  heading text,
  subheading text,
  link_url text,
  book_id uuid references public.books(id),
  author_id uuid references public.authors(id),
  publisher_id uuid references public.publishers(id),
  sort_order int not null default 0,
  is_visible boolean not null default true
);
create index on public.homepage_section_items (section_id);

-- =========================================================================
-- PLATFORM: audit log, system log, URL redirects (SEO continuity)
-- =========================================================================

create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.staff_members(id),
  action text not null,                              -- e.g. 'book.update', 'order.status_change'
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs (entity_type, entity_id);

create table public.system_logs (
  id uuid primary key default uuid_generate_v4(),
  level text not null,                               -- 'info' | 'warn' | 'error'
  source text not null,                               -- module name
  message text not null,
  context jsonb,
  created_at timestamptz not null default now()
);
create index on public.system_logs (created_at desc);

-- Preserves old WordPress URLs (/product/slug, /?p=123 etc.) as 301s into the new URL scheme.
create table public.url_redirects (
  id uuid primary key default uuid_generate_v4(),
  old_path text not null unique,
  new_path text not null,
  created_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email citext not null unique,
  subscribed_at timestamptz not null default now(),
  is_active boolean not null default true
);
