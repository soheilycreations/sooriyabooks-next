-- 0004_seed_reference_data.sql
-- Static reference data that is safe to seed immediately. Actual city-level
-- shipping rates and the product catalog are populated by the ETL migration
-- scripts described in docs/migration-plan.md (they must be reverse-engineered
-- from the WooCommerce "Cities & Shipping Zones" plugin's data and the WP
-- product/term tables, not hand-typed here).

insert into public.payment_providers (id, display_name, is_enabled, sort_order, config) values
  ('cod', 'Cash on Delivery', true, 1, '{}'::jsonb),
  ('bank_ipg', 'Bank Payment Gateway', true, 2, '{}'::jsonb)
on conflict (id) do nothing;

-- Sri Lanka's 25 administrative districts (stable reference data, not
-- WordPress-derived). Cities are populated per-district by the ETL script
-- using the legacy plugin's district->city mapping.
insert into public.shipping_districts (name, sort_order) values
  ('Colombo', 1), ('Gampaha', 2), ('Kalutara', 3), ('Kandy', 4), ('Matale', 5),
  ('Nuwara Eliya', 6), ('Galle', 7), ('Matara', 8), ('Hambantota', 9),
  ('Jaffna', 10), ('Kilinochchi', 11), ('Mannar', 12), ('Vavuniya', 13), ('Mullaitivu', 14),
  ('Batticaloa', 15), ('Ampara', 16), ('Trincomalee', 17),
  ('Kurunegala', 18), ('Puttalam', 19), ('Anuradhapura', 20), ('Polonnaruwa', 21),
  ('Badulla', 22), ('Monaragala', 23), ('Ratnapura', 24), ('Kegalle', 25)
on conflict (name) do nothing;

-- Example weight bands (grams) — admin can add/edit these freely in the
-- Shipping admin screen; replace with the store's real bands during ETL.
insert into public.shipping_weight_bands (min_weight_g, max_weight_g, label) values
  (0, 500, '0 - 500g'),
  (500, 1000, '500g - 1kg'),
  (1000, 2000, '1kg - 2kg'),
  (2000, 5000, '2kg - 5kg'),
  (5000, 999999, '5kg+')
on conflict do nothing;

-- Static pages shell — content to be migrated from the WP page bodies.
insert into public.static_pages (slug, title, body) values
  ('about', 'About Us', 'Content pending migration from the legacy site.'),
  ('privacy', 'Privacy Policy', 'Content pending migration from the legacy site.'),
  ('terms', 'Terms & Conditions', 'Content pending migration from the legacy site.'),
  ('contact', 'Contact Us', 'Content pending migration from the legacy site.')
on conflict (slug) do nothing;

-- Default homepage layout, matching the fixed section types the admin
-- panel manages (see docs/architecture.md and docs/feature-list.md).
insert into public.homepage_sections (type, title, sort_order) values
  ('hero_slider', 'Hero Slider', 1),
  ('promo_banner', 'Promotional Banners', 2),
  ('featured_books', 'Featured Books', 3),
  ('new_arrivals', 'New Arrivals', 4),
  ('best_sellers', 'Best Sellers', 5),
  ('featured_authors', 'Featured Authors', 6),
  ('featured_publishers', 'Featured Publishers', 7),
  ('offer_section', 'Special Offers', 8)
on conflict do nothing;
