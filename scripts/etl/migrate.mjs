#!/usr/bin/env node
/**
 * WordPress -> SooriyaBooks V2 data migration.
 *
 * AUTHOR_TAXONOMY / PUBLISHER_TAXONOMY below were CONFIRMED against the
 * real dump via scripts/etl/analyze.mjs, not guessed:
 *   - The original guess (`pa_author`/`pa_publisher`, the common
 *     WooCommerce-attribute convention) does not exist in this dump at all.
 *   - Two look-alike author taxonomies exist (`book_author` / `book-author`,
 *     562 terms each). Checked real product-linkage via
 *     wp_term_relationships, not just term counts: `book-author` is
 *     actually attached to 1,332 products vs. 884 for `book_author` — the
 *     latter is a largely-unused duplicate.
 *   - No taxonomy is literally named "publisher" — `brand` (1,625 products
 *     linked) contains exactly publisher names ("Sooriya Publishers",
 *     "Sarasavi Publishers", etc.) and is used as the publisher field here.
 *
 * KNOWN GAP: neither taxonomy covers the majority of the 4,822 products
 * (1,332 and 1,625 out of 4,822 respectively) — most books have no
 * author/publisher term at all. Sample titles suggest the real author name
 * is often embedded in the free-text title instead (e.g. "Markes
 * Sankathana - Ananda Amarasiri"). This script does NOT attempt to parse
 * that out — a book with no taxonomy term simply imports with
 * author_id/publisher_id left null rather than guessing from title text.
 * Parsing title suffixes is a reasonable follow-up enhancement if author/
 * publisher coverage after import turns out too sparse in practice.
 *
 * --dry-run performs the FULL transform (parses the dump, resolves
 * categories/authors/publishers, computes every field, checks local image
 * files exist, detects duplicate SKUs/slugs) but makes ZERO Supabase calls
 * and requires NO credentials — it never even constructs a Supabase client.
 * Only a real (non-dry-run) invocation needs SUPABASE_SERVICE_ROLE_KEY.
 *
 * Legacy WooCommerce orders (post_type='shop_order'), coupons
 * (post_type='shop_coupon'), and dynamic-pricing rules
 * (post_type='wc_dynamic_pricing') are never read by this script at all —
 * only 'product' and 'attachment' post types are scanned. The new platform
 * has its own order/coupon systems; migrating legacy transactional data
 * was an explicit non-goal in docs/migration-plan.md.
 *
 * Usage:
 *   node scripts/etl/migrate.mjs --dry-run                       # no credentials needed
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node scripts/etl/migrate.mjs                                # real import
 */
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { streamDumpRows } from "./dump-parser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AUTHOR_TAXONOMY = "book-author"; // confirmed via analyze.mjs — see comment above
const PUBLISHER_TAXONOMY = "brand"; // confirmed via analyze.mjs — see comment above

// Resolved against this script's own location (__dirname), NOT
// process.cwd() — see the identical comment in analyze.mjs. `pnpm
// migrate:run`/`migrate:dry-run` execute with cwd at the package root,
// one level shallower than __dirname, so a bare relative default here
// would land one directory too high.
const DEFAULT_DUMP_PATH = path.resolve(
  __dirname,
  "../../../u930615978_FX4fE.sooriyabooks-lk.20260731090448.sql/u930615978_FX4fE.sql",
);

const DUMP_PATH =
  process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) || process.env.WP_DUMP_PATH || DEFAULT_DUMP_PATH;
const DRY_RUN = process.argv.includes("--dry-run");

// Legacy site's local uploads directory (for re-uploading images to
// Supabase Storage without depending on the live site being reachable).
const DEFAULT_UPLOADS_DIR = path.resolve(
  __dirname,
  "../../../u930615978.sooriyabooks-lk.20260731090448/domains/sooriyabooks.lk/public_html/wp-content/uploads",
);
const UPLOADS_DIR = process.env.WP_UPLOADS_DIR || DEFAULT_UPLOADS_DIR;

const WP_POSTS_COLS = [
  "ID", "post_author", "post_date", "post_date_gmt", "post_content", "post_title", "post_excerpt",
  "post_status", "comment_status", "ping_status", "post_password", "post_name", "to_ping", "pinged",
  "post_modified", "post_modified_gmt", "post_content_filtered", "post_parent", "guid", "menu_order",
  "post_type", "post_mime_type", "comment_count",
];
const WP_POSTMETA_COLS = ["meta_id", "post_id", "meta_key", "meta_value"];
const WP_TERMS_COLS = ["term_id", "name", "slug", "term_group"];
const WP_TERM_TAXONOMY_COLS = ["term_taxonomy_id", "term_id", "taxonomy", "description", "parent", "count"];
const WP_TERM_RELATIONSHIPS_COLS = ["object_id", "term_taxonomy_id", "term_order"];

function rowToObject(cols, values) {
  const obj = {};
  cols.forEach((c, i) => (obj[c] = values[i]));
  return obj;
}

function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `item-${Math.random().toString(36).slice(2, 8)}`
  );
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let supabase = null;
  if (!DRY_RUN) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running a real (non-dry-run) migration.");
      process.exit(1);
    }
    const { createClient } = await import("@supabase/supabase-js");
    supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  console.log(`Reading dump: ${DUMP_PATH}`);
  console.log(DRY_RUN ? "Mode: DRY RUN — no Supabase calls will be made, no credentials used.\n" : "Mode: REAL IMPORT — will write to Supabase.\n");

  // ---- Pass 1: terms, taxonomy, relationships, posts, postmeta ----------
  const terms = new Map(); // term_id -> { name, slug }
  const taxonomyByTTId = new Map(); // term_taxonomy_id -> { term_id, taxonomy, parent }
  const relationships = new Map(); // object_id -> [term_taxonomy_id, ...]
  const posts = new Map(); // ID -> post row (product_type='product', status='publish', only)
  const postmetaByPostId = new Map(); // post_id -> { key: value }
  const attachmentCount = { total: 0 };

  await streamDumpRows(
    DUMP_PATH,
    ["wp_terms", "wp_term_taxonomy", "wp_term_relationships", "wp_posts", "wp_postmeta"],
    (table, values) => {
      if (table === "wp_terms") {
        const t = rowToObject(WP_TERMS_COLS, values);
        terms.set(t.term_id, { name: t.name, slug: t.slug });
      } else if (table === "wp_term_taxonomy") {
        const tt = rowToObject(WP_TERM_TAXONOMY_COLS, values);
        taxonomyByTTId.set(tt.term_taxonomy_id, { term_id: tt.term_id, taxonomy: tt.taxonomy, parent: tt.parent });
      } else if (table === "wp_term_relationships") {
        const r = rowToObject(WP_TERM_RELATIONSHIPS_COLS, values);
        if (!relationships.has(r.object_id)) relationships.set(r.object_id, []);
        relationships.get(r.object_id).push(r.term_taxonomy_id);
      } else if (table === "wp_posts") {
        const p = rowToObject(WP_POSTS_COLS, values);
        if (p.post_type === "product" && p.post_status === "publish") {
          posts.set(p.ID, p);
        } else if (p.post_type === "attachment") {
          attachmentCount.total++;
        }
        // Legacy shop_order / shop_coupon / wc_dynamic_pricing posts are
        // intentionally never captured here — see file header.
      } else if (table === "wp_postmeta") {
        const m = rowToObject(WP_POSTMETA_COLS, values);
        if (!postmetaByPostId.has(m.post_id)) postmetaByPostId.set(m.post_id, {});
        postmetaByPostId.get(m.post_id)[m.meta_key] = m.meta_value;
      }
    },
  );

  console.log(`Found ${posts.size} published products, ${terms.size} terms, ${attachmentCount.total} attachments in the library.\n`);

  // ---- Categories / authors / publishers ---------------------------------
  const categoryTermIds = new Set();
  const authorTermIds = new Set();
  const publisherTermIds = new Set();
  for (const [ttId, tt] of taxonomyByTTId) {
    if (tt.taxonomy === "product_cat") categoryTermIds.add(ttId);
    else if (tt.taxonomy === AUTHOR_TAXONOMY) authorTermIds.add(ttId);
    else if (tt.taxonomy === PUBLISHER_TAXONOMY) publisherTermIds.add(ttId);
  }

  const categoryIdMap = new Map(); // wp term_taxonomy_id -> supabase category id (or dry-run placeholder)
  const authorIdMap = new Map();
  const publisherIdMap = new Map();
  const termNameSlugCollisions = []; // duplicate slugs within one taxonomy — would silently collapse on upsert

  async function resolveTaxonomyTerms(ttIds, table) {
    const idMap = new Map();
    const seenSlugs = new Map(); // slug -> first term name that claimed it
    for (const ttId of ttIds) {
      const tt = taxonomyByTTId.get(ttId);
      const term = terms.get(tt.term_id);
      if (!term) continue;
      const slug = term.slug || slugify(term.name);

      if (seenSlugs.has(slug) && seenSlugs.get(slug) !== term.name) {
        termNameSlugCollisions.push({ table, slug, names: [seenSlugs.get(slug), term.name] });
      }
      seenSlugs.set(slug, term.name);

      if (DRY_RUN) {
        idMap.set(ttId, `dry-run-${table}-${ttId}`);
        continue;
      }
      const { data, error } = await supabase
        .from(table)
        .upsert({ name: term.name, slug }, { onConflict: "slug" })
        .select("id")
        .single();
      if (error) {
        console.error(`  ! Failed to upsert ${table} "${term.name}":`, error.message);
        continue;
      }
      idMap.set(ttId, data.id);
    }
    return idMap;
  }

  console.log("Resolving categories...");
  for (const [k, v] of await resolveTaxonomyTerms(categoryTermIds, "categories")) categoryIdMap.set(k, v);
  console.log(`  -> ${categoryIdMap.size} categories\n`);

  console.log(`Resolving authors (taxonomy: ${AUTHOR_TAXONOMY})...`);
  for (const [k, v] of await resolveTaxonomyTerms(authorTermIds, "authors")) authorIdMap.set(k, v);
  console.log(`  -> ${authorIdMap.size} authors\n`);

  console.log(`Resolving publishers (taxonomy: ${PUBLISHER_TAXONOMY})...`);
  for (const [k, v] of await resolveTaxonomyTerms(publisherTermIds, "publishers")) publisherIdMap.set(k, v);
  console.log(`  -> ${publisherIdMap.size} publishers\n`);

  // ---- Products ------------------------------------------------------------
  console.log(`${DRY_RUN ? "Analyzing" : "Importing"} products...`);

  const stats = {
    totalCandidates: posts.size,
    wouldImport: 0,
    skippedNoPrice: 0,
    withImage: 0,
    missingImage: 0,
    missingSku: 0,
    missingPrice: 0,
    onSale: 0,
    missingOrInvalidWeight: 0,
    // Stock-mode breakdown (see supabase/migrations/0011-0012 — a business
    // decision, not a fallback: WooCommerce only writes a numeric _stock
    // when "Manage stock?" is on; most of this catalog never had it on, so
    // most products get NO fabricated quantity, only a tracked/untracked
    // flag reflecting the real source data).
    realNumericStock: 0,
    untrackedInStock: 0,
    untrackedOutOfStock: 0,
    missingStockMetaEntirely: 0,
    withAuthor: 0,
    withPublisher: 0,
    withoutAuthorOrPublisher: 0,
    withCategory: 0,
    withoutCategory: 0,
    withSeoTitle: 0,
    writeErrors: [],
  };
  const seenSkus = new Map(); // sku -> [postId, ...]
  const seenSlugs = new Map(); // slug -> [postId, ...]
  const sampleTransformed = [];

  for (const [postId, post] of posts) {
    const meta = postmetaByPostId.get(postId) || {};
    const hasRealSku = !!meta._sku;
    const sku = meta._sku || `SB-${postId}`;
    const slug = post.post_name || slugify(post.post_title);

    const rawWeight = meta._weight != null ? parseFloat(meta._weight) : NaN;
    const weightIsValid = Number.isFinite(rawWeight) && rawWeight > 0;
    // The store's woocommerce_weight_unit is 'g' (confirmed against the
    // actual dump, not assumed) — _weight is already in grams, no kg->g
    // conversion applied here. See file header.
    const weightGrams = weightIsValid ? Math.round(rawWeight) : 100; // 100g fallback — never 0, shipping calc requires a positive weight

    const sellingPriceRaw = meta._regular_price || meta._price;
    const sellingPrice = parseFloat(sellingPriceRaw || "0") || 0;
    const salePrice = meta._sale_price ? parseFloat(meta._sale_price) : null;
    const isOnSale = salePrice != null && salePrice < sellingPrice;

    // --- Stock mode: NEVER fabricate a quantity. See file header + stats comment above. ---
    const stockRaw = meta._stock;
    const stockStatus = meta._stock_status; // 'instock' | 'outofstock' | 'onbackorder' | undefined
    const hasNumericStock = stockRaw != null && stockRaw !== "" && Number.isFinite(parseInt(stockRaw, 10));

    let stockTrackingEnabled;
    let trackedQuantity = null; // only meaningful when stockTrackingEnabled
    let untrackedAvailable = null; // only meaningful when !stockTrackingEnabled

    if (hasNumericStock) {
      stockTrackingEnabled = true;
      trackedQuantity = Math.max(parseInt(stockRaw, 10), 0);
    } else {
      stockTrackingEnabled = false;
      // instock/onbackorder -> sellable; outofstock, or no status at all
      // (no positive signal either way) -> unavailable. Conservative on
      // the unknown case: never guess "sellable" without source evidence.
      untrackedAvailable = stockStatus === "instock" || stockStatus === "onbackorder";
    }

    const rels = relationships.get(postId) || [];
    const categoryIds = rels.filter((ttId) => categoryIdMap.has(ttId));
    const authorTTId = rels.find((ttId) => authorIdMap.has(ttId));
    const publisherTTId = rels.find((ttId) => publisherIdMap.has(ttId));

    const seoTitle = meta.rank_math_title || null;
    const seoDescription = meta.rank_math_description || null;

    const thumbnailId = meta._thumbnail_id ? Number(meta._thumbnail_id) : null;
    const attachedFile = thumbnailId != null ? postmetaByPostId.get(thumbnailId)?._wp_attached_file : null;
    let imageFoundLocally = false;
    if (attachedFile) {
      const localPath = path.resolve(UPLOADS_DIR, attachedFile);
      imageFoundLocally = await fileExists(localPath);
    }

    // --- stat tracking (always, dry-run or not) ---
    if (!hasRealSku) stats.missingSku++;
    if (sellingPrice <= 0) stats.missingPrice++;
    if (isOnSale) stats.onSale++;
    if (!weightIsValid) stats.missingOrInvalidWeight++;
    if (stockRaw == null) stats.missingStockMetaEntirely++;
    if (stockTrackingEnabled) stats.realNumericStock++;
    else if (untrackedAvailable) stats.untrackedInStock++;
    else stats.untrackedOutOfStock++;
    if (attachedFile && imageFoundLocally) stats.withImage++;
    else stats.missingImage++;
    if (authorTTId) stats.withAuthor++;
    if (publisherTTId) stats.withPublisher++;
    if (!authorTTId && !publisherTTId) stats.withoutAuthorOrPublisher++;
    if (categoryIds.length > 0) stats.withCategory++;
    else stats.withoutCategory++;
    if (seoTitle) stats.withSeoTitle++;

    if (!seenSkus.has(sku)) seenSkus.set(sku, []);
    seenSkus.get(sku).push(postId);
    if (!seenSlugs.has(slug)) seenSlugs.set(slug, []);
    seenSlugs.get(slug).push(postId);

    if (sellingPrice <= 0) {
      stats.skippedNoPrice++;
      continue; // a product with no price isn't sellable — skip rather than import broken data
    }

    if (sampleTransformed.length < 8) {
      sampleTransformed.push({
        id: postId,
        title: post.post_title,
        slug,
        sku,
        sellingPrice,
        salePrice: isOnSale ? salePrice : null,
        weightGrams,
        stockMode: stockTrackingEnabled ? `tracked(${trackedQuantity})` : untrackedAvailable ? "untracked-in-stock" : "untracked-out-of-stock",
        hasImage: !!attachedFile && imageFoundLocally,
        hasAuthor: !!authorTTId,
        hasPublisher: !!publisherTTId,
        categoryCount: categoryIds.length,
      });
    }

    if (DRY_RUN) {
      stats.wouldImport++;
      continue;
    }

    const { data: book, error } = await supabase
      .from("books")
      .upsert(
        {
          title: post.post_title,
          slug,
          sku,
          weight_grams: weightGrams,
          selling_price: sellingPrice,
          discount_price: isOnSale ? salePrice : null,
          description: post.post_content || null,
          short_description: post.post_excerpt || null,
          author_id: authorTTId ? authorIdMap.get(authorTTId) : null,
          publisher_id: publisherTTId ? publisherIdMap.get(publisherTTId) : null,
          is_active: true,
          seo_title: seoTitle,
          seo_description: seoDescription,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (error) {
      stats.writeErrors.push({ postId, title: post.post_title, message: error.message });
      continue;
    }

    if (categoryIds.length > 0) {
      await supabase.from("book_categories").delete().eq("book_id", book.id);
      await supabase
        .from("book_categories")
        .insert(categoryIds.map((ttId) => ({ book_id: book.id, category_id: categoryIdMap.get(ttId) })));
    }

    await supabase.from("inventory").upsert(
      stockTrackingEnabled
        ? { book_id: book.id, stock_tracking_enabled: true, quantity_on_hand: trackedQuantity }
        : { book_id: book.id, stock_tracking_enabled: false, untracked_available: untrackedAvailable },
    );

    // Primary image: read from the local uploads backup and re-upload to
    // Supabase Storage (avoids depending on the live site, which was down
    // with Cloudflare 522s at the time of this project).
    if (attachedFile && imageFoundLocally) {
      try {
        const localPath = path.resolve(UPLOADS_DIR, attachedFile);
        const fileBuffer = await readFile(localPath);
        const ext = path.extname(attachedFile) || ".jpg";
        const storagePath = `products/${book.id}${ext}`;
        const { error: uploadError } = await supabase.storage.from("media").upload(storagePath, fileBuffer, { upsert: true });
        if (!uploadError) {
          const { data: media } = await supabase
            .from("media_assets")
            .insert({ kind: "image", storage_path: storagePath, alt_text: post.post_title })
            .select("id")
            .single();
          if (media) {
            await supabase.from("book_images").delete().eq("book_id", book.id);
            await supabase.from("book_images").insert({ book_id: book.id, media_id: media.id, is_primary: true, sort_order: 0 });
          }
        }
      } catch {
        // Upload failed for a reason other than "file doesn't exist" (that
        // case is already excluded via imageFoundLocally) — not fatal to
        // the whole run.
      }
    }

    stats.wouldImport++;
    if (stats.wouldImport % 200 === 0) console.log(`  ... ${stats.wouldImport} imported`);
  }

  const duplicateSkus = [...seenSkus.entries()].filter(([, ids]) => ids.length > 1);
  const duplicateSlugs = [...seenSlugs.entries()].filter(([, ids]) => ids.length > 1);

  // ---- Report ---------------------------------------------------------------
  console.log(`\n${"=".repeat(70)}`);
  console.log(DRY_RUN ? "DRY RUN REPORT (nothing written to Supabase)" : "IMPORT COMPLETE");
  console.log("=".repeat(70));

  console.log(`\nProducts scanned (post_type='product', status='publish'): ${stats.totalCandidates}`);
  console.log(`Would be imported (has a valid price):                    ${stats.wouldImport}`);
  console.log(`Skipped — no valid price:                                 ${stats.skippedNoPrice}`);

  console.log(`\nCategories resolved:  ${categoryIdMap.size}`);
  console.log(`Authors resolved:     ${authorIdMap.size}  (taxonomy: ${AUTHOR_TAXONOMY})`);
  console.log(`Publishers resolved:  ${publisherIdMap.size}  (taxonomy: ${PUBLISHER_TAXONOMY})`);

  console.log(`\n--- Field coverage across all ${stats.totalCandidates} scanned products ---`);
  console.log(`With image found locally:        ${stats.withImage}`);
  console.log(`Missing image:                   ${stats.missingImage}`);
  console.log(`Missing real SKU (would fallback to SB-<id>): ${stats.missingSku}`);
  console.log(`Missing/zero price:               ${stats.missingPrice}`);
  console.log(`Currently on sale:                ${stats.onSale}`);
  console.log(`Missing/invalid weight (would fallback to 100g): ${stats.missingOrInvalidWeight}`);
  console.log(`\n--- Stock mode breakdown (see supabase/migrations/0011-0012 — no fabricated quantities) ---`);
  console.log(`Real numeric stock (tracked, real quantity imported): ${stats.realNumericStock}`);
  console.log(`Untracked / in stock (sellable, no quantity):         ${stats.untrackedInStock}`);
  console.log(`Untracked / out of stock (unavailable, no quantity):  ${stats.untrackedOutOfStock}`);
  console.log(`(of which, missing _stock meta entirely):             ${stats.missingStockMetaEntirely}`);
  console.log(`With author (${AUTHOR_TAXONOMY}):        ${stats.withAuthor}`);
  console.log(`With publisher (${PUBLISHER_TAXONOMY}):           ${stats.withPublisher}`);
  console.log(`With NEITHER author nor publisher: ${stats.withoutAuthorOrPublisher}`);
  console.log(`With at least one category:       ${stats.withCategory}`);
  console.log(`Without any category:             ${stats.withoutCategory}`);
  console.log(`With Rank Math SEO title:          ${stats.withSeoTitle}`);

  console.log(`\n--- Duplicate/conflict check ---`);
  if (duplicateSkus.length === 0) {
    console.log("No duplicate SKUs found among scanned products.");
  } else {
    console.log(`WARNING: ${duplicateSkus.length} SKU value(s) shared by more than one product (books.sku is UNIQUE — a real run would fail on the 2nd+ occurrence of each):`);
    for (const [sku, ids] of duplicateSkus.slice(0, 15)) console.log(`  "${sku}"  <-  post IDs ${ids.join(", ")}`);
    if (duplicateSkus.length > 15) console.log(`  ...and ${duplicateSkus.length - 15} more`);
  }
  if (duplicateSlugs.length === 0) {
    console.log("No duplicate slugs found among scanned products.");
  } else {
    console.log(`WARNING: ${duplicateSlugs.length} slug value(s) shared by more than one product (upsert onConflict:'slug' means later rows would OVERWRITE earlier ones with the same slug — data loss risk):`);
    for (const [slug, ids] of duplicateSlugs.slice(0, 15)) console.log(`  "${slug}"  <-  post IDs ${ids.join(", ")}`);
    if (duplicateSlugs.length > 15) console.log(`  ...and ${duplicateSlugs.length - 15} more`);
  }
  if (termNameSlugCollisions.length > 0) {
    console.log(`WARNING: ${termNameSlugCollisions.length} taxonomy term slug collision(s) (two differently-named terms sharing one slug — the 2nd would overwrite the 1st on upsert):`);
    for (const c of termNameSlugCollisions.slice(0, 10)) console.log(`  [${c.table}] slug "${c.slug}": ${c.names.join(" vs ")}`);
  }

  console.log(`\n--- Sample transformed products (first 8 that would import) ---`);
  for (const p of sampleTransformed) {
    console.log(
      `  #${p.id} "${p.title}"\n` +
        `      slug=${p.slug} sku=${p.sku} price=${p.sellingPrice}${p.salePrice ? ` sale=${p.salePrice}` : ""} ` +
        `weight=${p.weightGrams}g stock=${p.stockMode} image=${p.hasImage ? "yes" : "no"} ` +
        `author=${p.hasAuthor ? "yes" : "no"} publisher=${p.hasPublisher ? "yes" : "no"} categories=${p.categoryCount}`,
    );
  }

  if (stats.writeErrors.length > 0) {
    console.log(`\n--- Write errors (${stats.writeErrors.length}) ---`);
    for (const e of stats.writeErrors.slice(0, 20)) console.log(`  #${e.postId} "${e.title}": ${e.message}`);
  }

  console.log(`\n${DRY_RUN ? "Dry run complete — nothing was written to Supabase, no credentials were used." : "Import complete."}`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
