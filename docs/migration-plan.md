# Migration Plan — WordPress Data → V2 Schema

Business data is reverse-engineered and re-imported; **no WordPress code, tables, or plugins are used at runtime.** All migration is one-time ETL from the SQL dump into the new normalized schema.

## Source facts confirmed from the dump audit
- ~4,822 products (`wp_posts` where `post_type='product'`) — Books.
- 63 `product_cat` terms — Categories (with parent/child hierarchy via `wp_term_taxonomy.parent`).
- Author/Publisher likely modeled as WooCommerce product attributes (`pa_author`, `pa_publisher`) or custom taxonomies in the legacy site — **to confirm during ETL script development** by inspecting `wp_term_taxonomy.taxonomy` values beyond `product_cat`.
- Product weight, SKU, price, sale price, stock — standard WooCommerce postmeta keys (`_weight`, `_sku`, `_regular_price`, `_sale_price`, `_stock`, `_stock_status`).
- Shipping-by-city data lives in the "Cities & Shipping Zones for WooCommerce" plugin's own tables/options — not part of the WordPress core dump structure audited so far; **first ETL task is to locate and parse that plugin's district/city/rate storage** (likely custom tables or a structured option), since this is business-critical and must not be approximated.
- Branding: site title "Sooriya Publishers Official Online Store", tagline "Buy Books to your Doorstep", logo at `wp-content/uploads/2025/12/Group-176.png`, brand accent `#f4a938`/`#ff7e00`, fonts Marcellus (headings) + Jost (body) — already encoded into `tailwind.config.ts`.
- 9,676 `wp_users` rows, but ~73% are bot/fake registrations (per the forensic DB audit) — **migration must filter these out**, not import them as real customers. Only import users with at least one real order (join against `wp_posts` where `post_type='shop_order'`/`wc_orders` equivalent) or explicit staff accounts.
- Existing admin accounts (`admin`, `manager`, `manager2`, `admin2`) map to `staff_members` with appropriate roles — confirm final role mapping with the site owner before import.

## ETL pipeline (scripts live in `scripts/etl/`, run once, offline, against the SQL dump — never against production)

1. **Parse dump → staging JSON** — a Node script reads the `.sql` file (same line-per-row format documented in the forensic audit), extracts `wp_posts`, `wp_postmeta`, `wp_terms`, `wp_term_taxonomy`, `wp_term_relationships`, `wp_users` into intermediate JSON files. No live MySQL connection required or used.
2. **Transform**:
   - Products → `books` + `inventory` + `book_images` (resolve attachment IDs to Supabase Storage uploads) + `book_categories`.
   - Terms → `categories` (preserving hierarchy), plus `authors`/`publishers` once their source taxonomy is confirmed.
   - Shipping plugin data → `shipping_districts` / `shipping_cities` / `shipping_weight_bands` / `shipping_rates` (this is the one dataset that needs manual verification against the live plugin settings, since a full parse wasn't done in this pass).
   - Orders (historical) → `orders`/`order_items` for order-history continuity, if desired; optional — confirm with owner whether historical orders should be imported or the platform should start clean.
   - Filtered real customers → `auth.users` (via Supabase Admin API, generating password-reset invites — WordPress password hashes are not portable to Supabase Auth) + `profiles`.
3. **Load** — insert into Supabase via the service-role key, in dependency order (categories → authors/publishers → books → book_categories → book_images → inventory → shipping tables).
4. **Verify** — row-count reconciliation report (source count vs. loaded count per entity), spot-check a sample of books/categories/prices against the live site before cutover.
5. **URL redirects** — populate `url_redirects` mapping legacy `/product/<slug>/`, `/product-category/<slug>/`, `/?p=<id>` patterns to the new URL scheme, so existing SEO equity/backlinks 301 correctly instead of 404ing.

## Explicit non-goals
- No WordPress plugin data (Wordfence, Jetpack, Yoast internals, Action Scheduler, mail logs) is migrated — it's operational data belonging to the old stack, not business data.
- No WooCommerce order/session tables are migrated wholesale — only the filtered, real subset described above, and only if the owner wants historical order continuity in the new system.
- The abandoned `/autumn/` WordPress install (flagged in the forensic audit as a stale Hostinger demo) is not a data source for anything.

## Sequencing relative to this build
This plan is documented now so the schema (already written) accounts for it, but the ETL scripts themselves run **after** the platform's core CRUD is working end-to-end — running them earlier just means re-running them again once the shipping-plugin data format is confirmed. Tracked as a discrete phase in the build (see project status updates).
