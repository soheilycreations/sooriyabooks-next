#!/usr/bin/env node
/**
 * WordPress -> SooriyaBooks V2 data migration.
 *
 * RUN scripts/etl/analyze.mjs FIRST and confirm AUTHOR_TAXONOMY /
 * PUBLISHER_TAXONOMY below actually match what's in the dump — this
 * script guesses the common WooCommerce convention (`pa_author` /
 * `pa_publisher` product attributes) but that must be verified, not
 * assumed, per docs/migration-plan.md.
 *
 * Read-only against the SQL dump; writes to Supabase via the service-role
 * key. Safe to re-run (upserts by slug/sku), but back up your Supabase
 * project first if you're re-running after manual admin-panel edits.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node scripts/etl/migrate.mjs [path-to-dump.sql] [--dry-run]
 */
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { streamDumpRows } from "./dump-parser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AUTHOR_TAXONOMY = "pa_author"; // TODO: confirm via analyze.mjs
const PUBLISHER_TAXONOMY = "pa_publisher"; // TODO: confirm via analyze.mjs

const DUMP_PATH =
  process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ||
  process.env.WP_DUMP_PATH ||
  "../../../u930615978_FX4fE.sooriyabooks-lk.20260731090448.sql/u930615978_FX4fE.sql";
const DRY_RUN = process.argv.includes("--dry-run");

// Legacy site's local uploads directory (for re-uploading images to
// Supabase Storage without depending on the live site being reachable).
const UPLOADS_DIR = process.env.WP_UPLOADS_DIR ||
  "../../../u930615978.sooriyabooks-lk.20260731090448/domains/sooriyabooks.lk/public_html/wp-content/uploads";

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
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `item-${Math.random().toString(36).slice(2, 8)}`;
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.");
    process.exit(1);
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Reading dump: ${DUMP_PATH}${DRY_RUN ? " (dry run — no writes)" : ""}\n`);

  // ---- Pass 1: terms, taxonomy, relationships, posts, postmeta ----------
  const terms = new Map(); // term_id -> { name, slug }
  const taxonomyByTTId = new Map(); // term_taxonomy_id -> { term_id, taxonomy, parent }
  const relationships = new Map(); // object_id -> [term_taxonomy_id, ...]
  const posts = new Map(); // ID -> post row (product_type='product' only, kept for memory)
  const postmetaByPostId = new Map(); // post_id -> { key: value }
  const attachments = new Map(); // ID -> { guid, attachedFile }

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
          attachments.set(p.ID, { guid: p.guid, title: p.post_title });
        }
      } else if (table === "wp_postmeta") {
        const m = rowToObject(WP_POSTMETA_COLS, values);
        if (!postmetaByPostId.has(m.post_id)) postmetaByPostId.set(m.post_id, {});
        postmetaByPostId.get(m.post_id)[m.meta_key] = m.meta_value;
      }
    },
  );

  console.log(`Found ${posts.size} published products, ${terms.size} terms, ${attachments.size} attachments.\n`);

  // ---- Categories / authors / publishers ---------------------------------
  const categoryTermIds = new Set();
  const authorTermIds = new Set();
  const publisherTermIds = new Set();
  for (const [ttId, tt] of taxonomyByTTId) {
    if (tt.taxonomy === "product_cat") categoryTermIds.add(ttId);
    else if (tt.taxonomy === AUTHOR_TAXONOMY) authorTermIds.add(ttId);
    else if (tt.taxonomy === PUBLISHER_TAXONOMY) publisherTermIds.add(ttId);
  }

  const categoryIdMap = new Map(); // wp term_taxonomy_id -> supabase category id
  const authorIdMap = new Map();
  const publisherIdMap = new Map();

  async function upsertTaxonomyTerms(ttIds, table) {
    const idMap = new Map();
    for (const ttId of ttIds) {
      const tt = taxonomyByTTId.get(ttId);
      const term = terms.get(tt.term_id);
      if (!term) continue;
      if (DRY_RUN) {
        idMap.set(ttId, `dry-run-${table}-${ttId}`);
        continue;
      }
      const { data, error } = await supabase
        .from(table)
        .upsert({ name: term.name, slug: term.slug || slugify(term.name) }, { onConflict: "slug" })
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

  console.log("Importing categories...");
  const catMap = await upsertTaxonomyTerms(categoryTermIds, "categories");
  for (const [k, v] of catMap) categoryIdMap.set(k, v);
  console.log(`  -> ${categoryIdMap.size} categories\n`);

  console.log(`Importing authors (taxonomy: ${AUTHOR_TAXONOMY})...`);
  const authMap = await upsertTaxonomyTerms(authorTermIds, "authors");
  for (const [k, v] of authMap) authorIdMap.set(k, v);
  console.log(`  -> ${authorIdMap.size} authors\n`);

  console.log(`Importing publishers (taxonomy: ${PUBLISHER_TAXONOMY})...`);
  const pubMap = await upsertTaxonomyTerms(publisherTermIds, "publishers");
  for (const [k, v] of pubMap) publisherIdMap.set(k, v);
  console.log(`  -> ${publisherIdMap.size} publishers\n`);

  // ---- Products ------------------------------------------------------------
  console.log("Importing products...");
  let imported = 0;
  let skipped = 0;

  for (const [postId, post] of posts) {
    const meta = postmetaByPostId.get(postId) || {};
    const sku = meta._sku || `SB-${postId}`;
    const weightKg = parseFloat(meta._weight || "0");
    const weightGrams = Math.round((Number.isFinite(weightKg) ? weightKg : 0) * 1000) || 100; // default 100g if missing — never 0, shipping calc requires a positive weight
    const sellingPrice = parseFloat(meta._regular_price || meta._price || "0") || 0;
    const salePrice = meta._sale_price ? parseFloat(meta._sale_price) : null;
    const stock = meta._stock != null ? parseInt(meta._stock, 10) : 0;

    const rels = relationships.get(postId) || [];
    const categoryIds = rels.filter((ttId) => categoryIdMap.has(ttId)).map((ttId) => categoryIdMap.get(ttId));
    const authorTTId = rels.find((ttId) => authorIdMap.has(ttId));
    const publisherTTId = rels.find((ttId) => publisherIdMap.has(ttId));

    const seoTitle = meta.rank_math_title || null;
    const seoDescription = meta.rank_math_description || null;

    if (sellingPrice <= 0) {
      skipped++;
      continue; // a product with no price isn't sellable — skip rather than import broken data
    }

    if (DRY_RUN) {
      imported++;
      continue;
    }

    const { data: book, error } = await supabase
      .from("books")
      .upsert(
        {
          title: post.post_title,
          slug: post.post_name || slugify(post.post_title),
          sku,
          weight_grams: weightGrams,
          selling_price: sellingPrice,
          discount_price: salePrice && salePrice < sellingPrice ? salePrice : null,
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
      console.error(`  ! Failed to import "${post.post_title}":`, error.message);
      skipped++;
      continue;
    }

    if (categoryIds.length > 0) {
      await supabase.from("book_categories").delete().eq("book_id", book.id);
      await supabase.from("book_categories").insert(categoryIds.map((categoryId) => ({ book_id: book.id, category_id: categoryId })));
    }

    await supabase.from("inventory").upsert({ book_id: book.id, quantity_on_hand: Math.max(stock, 0) });

    // Primary image: read from the local uploads backup and re-upload to
    // Supabase Storage (avoids depending on the live site, which was down
    // with Cloudflare 522s at the time of this project).
    const thumbnailId = meta._thumbnail_id ? Number(meta._thumbnail_id) : null;
    const attachedFileMeta = thumbnailId != null ? postmetaByPostId.get(thumbnailId) : null;
    const attachedFile = attachedFileMeta?._wp_attached_file;
    if (attachedFile) {
      try {
        const localPath = path.resolve(__dirname, UPLOADS_DIR, attachedFile);
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
        // Image file not found locally or upload failed — the product
        // still imports without a cover; not fatal to the whole run.
      }
    }

    imported++;
    if (imported % 200 === 0) console.log(`  ... ${imported} imported`);
  }

  console.log(`\nDone. Imported ${imported} products, skipped ${skipped} (no valid price or write error).`);
  if (DRY_RUN) console.log("This was a dry run — nothing was written to Supabase.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
