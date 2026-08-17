#!/usr/bin/env node
/**
 * Read-only analysis pass over the legacy WordPress SQL dump. Run this
 * BEFORE `migrate.mjs` — it never writes to Supabase or touches the dump
 * file. Reports what's actually in the dump (post types, taxonomy names +
 * samples, product status breakdown, postmeta field frequency) so the
 * transform logic in migrate.mjs can be verified against reality rather
 * than assumed, per docs/migration-plan.md.
 *
 * Usage: node scripts/etl/analyze.mjs [path-to-dump.sql]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { streamDumpRows } from "./dump-parser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolved against this script's own location (__dirname), NOT
// process.cwd() — `pnpm migrate:analyze` runs with cwd set to the package
// root (sooriyabooks-v2/), one level shallower than __dirname
// (sooriyabooks-v2/scripts/etl/), so a bare relative path here would land
// one directory too high. Resolving from __dirname keeps this correct
// regardless of where the script is invoked from, without hardcoding an
// absolute path.
const DEFAULT_DUMP_PATH = path.resolve(
  __dirname,
  "../../../u930615978_FX4fE.sooriyabooks-lk.20260731090448.sql/u930615978_FX4fE.sql",
);

const DUMP_PATH = process.argv[2] || process.env.WP_DUMP_PATH || DEFAULT_DUMP_PATH;

// Standard WordPress 6.x column order (verify against `SHOW CREATE TABLE`
// in the dump if this project's schema ever diverges from stock WP).
const WP_POSTS_COLS = [
  "ID", "post_author", "post_date", "post_date_gmt", "post_content", "post_title", "post_excerpt",
  "post_status", "comment_status", "ping_status", "post_password", "post_name", "to_ping", "pinged",
  "post_modified", "post_modified_gmt", "post_content_filtered", "post_parent", "guid", "menu_order",
  "post_type", "post_mime_type", "comment_count",
];
const WP_POSTMETA_COLS = ["meta_id", "post_id", "meta_key", "meta_value"];
const WP_TERM_TAXONOMY_COLS = ["term_taxonomy_id", "term_id", "taxonomy", "description", "parent", "count"];
const WP_TERMS_COLS = ["term_id", "name", "slug", "term_group"];
const WP_TERM_RELATIONSHIPS_COLS = ["object_id", "term_taxonomy_id", "term_order"];

function rowToObject(cols, values) {
  const obj = {};
  cols.forEach((c, i) => (obj[c] = values[i]));
  return obj;
}

const CANDIDATE_TAXONOMIES = ["book_author", "book-author", "brand", "pa_author", "pa_publisher", "publisher"];

async function main() {
  console.log(`Analyzing: ${DUMP_PATH}\n`);

  const postTypeCounts = new Map();
  const productStatusCounts = new Map();
  const taxonomyCounts = new Map();
  const sampleProducts = [];
  const productIds = new Set();
  const terms = new Map(); // term_id -> name
  const taxonomyByTTId = new Map(); // term_taxonomy_id -> { term_id, taxonomy }
  const sampleTermsByTaxonomy = new Map(); // taxonomy -> Set(names), capped
  const relationships = []; // { objectId, ttId } — filtered against productIds after this pass

  console.log("Pass 1/2: scanning posts, terms, taxonomy, term-relationships...");
  await streamDumpRows(
    DUMP_PATH,
    ["wp_posts", "wp_term_taxonomy", "wp_terms", "wp_term_relationships"],
    (table, values) => {
      if (table === "wp_posts") {
        const post = rowToObject(WP_POSTS_COLS, values);
        postTypeCounts.set(post.post_type, (postTypeCounts.get(post.post_type) || 0) + 1);
        if (post.post_type === "product") {
          productIds.add(post.ID);
          productStatusCounts.set(post.post_status, (productStatusCounts.get(post.post_status) || 0) + 1);
          if (sampleProducts.length < 5 && post.post_status === "publish") {
            sampleProducts.push({ id: post.ID, title: post.post_title, slug: post.post_name, status: post.post_status });
          }
        }
      } else if (table === "wp_term_taxonomy") {
        const tt = rowToObject(WP_TERM_TAXONOMY_COLS, values);
        taxonomyCounts.set(tt.taxonomy, (taxonomyCounts.get(tt.taxonomy) || 0) + 1);
        taxonomyByTTId.set(tt.term_taxonomy_id, { term_id: tt.term_id, taxonomy: tt.taxonomy });
      } else if (table === "wp_terms") {
        const t = rowToObject(WP_TERMS_COLS, values);
        terms.set(t.term_id, t.name);
      } else if (table === "wp_term_relationships") {
        const r = rowToObject(WP_TERM_RELATIONSHIPS_COLS, values);
        relationships.push({ objectId: r.object_id, ttId: r.term_taxonomy_id });
      }
    },
  );

  // Real usage count per candidate taxonomy: how many actual PRODUCT posts
  // are linked to a term in that taxonomy — the decisive signal for which
  // of two same-sized candidate taxonomies (e.g. book_author vs
  // book-author) is the one actually attached to products, vs. an unused
  // duplicate registered by a theme/plugin.
  const realUsageByTaxonomy = new Map();
  for (const { objectId, ttId } of relationships) {
    if (!productIds.has(objectId)) continue;
    const tt = taxonomyByTTId.get(ttId);
    if (!tt || !CANDIDATE_TAXONOMIES.includes(tt.taxonomy)) continue;
    if (!realUsageByTaxonomy.has(tt.taxonomy)) realUsageByTaxonomy.set(tt.taxonomy, new Set());
    realUsageByTaxonomy.get(tt.taxonomy).add(objectId);
  }

  // Backfill sample term names now that both wp_terms and wp_term_taxonomy are loaded.
  for (const { term_id, taxonomy } of taxonomyByTTId.values()) {
    if (!CANDIDATE_TAXONOMIES.includes(taxonomy)) continue;
    const name = terms.get(term_id);
    if (!name) continue;
    if (!sampleTermsByTaxonomy.has(taxonomy)) sampleTermsByTaxonomy.set(taxonomy, []);
    const list = sampleTermsByTaxonomy.get(taxonomy);
    if (list.length < 8) list.push(name);
  }

  console.log(`Pass 2/2: scanning postmeta for ${productIds.size} products...`);
  const metaKeyCounts = new Map();
  const metaSamples = new Map(); // meta_key -> one sample value
  await streamDumpRows(DUMP_PATH, ["wp_postmeta"], (table, values) => {
    const m = rowToObject(WP_POSTMETA_COLS, values);
    if (!productIds.has(m.post_id)) return;
    metaKeyCounts.set(m.meta_key, (metaKeyCounts.get(m.meta_key) || 0) + 1);
    if (!metaSamples.has(m.meta_key) && m.meta_value != null && String(m.meta_value).length < 120) {
      metaSamples.set(m.meta_key, m.meta_value);
    }
  });

  console.log("\n=== post_type breakdown ===");
  for (const [type, count] of [...postTypeCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(6)}  ${type}`);
  }

  console.log("\n=== product status breakdown (post_type='product') ===");
  for (const [status, count] of [...productStatusCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(6)}  ${status}`);
  }

  console.log("\n=== taxonomy breakdown (term_taxonomy.taxonomy) ===");
  for (const [tax, count] of [...taxonomyCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(6)}  ${tax}`);
  }

  console.log("\n=== sample term names for author/publisher candidate taxonomies ===");
  for (const tax of CANDIDATE_TAXONOMIES) {
    const samples = sampleTermsByTaxonomy.get(tax);
    if (samples) console.log(`  ${tax}: ${samples.join(", ")}`);
  }

  console.log("\n=== REAL usage: products actually linked to each candidate taxonomy ===");
  console.log("  (this is the decisive check for duplicate-looking taxonomies like book_author vs book-author)");
  for (const tax of CANDIDATE_TAXONOMIES) {
    const used = realUsageByTaxonomy.get(tax);
    if (used) console.log(`  ${tax}: ${used.size} distinct products actually tagged`);
  }

  console.log(`\n=== sample published products ===`);
  for (const p of sampleProducts) console.log(`  #${p.id}  [${p.status}]  ${p.title}  (${p.slug})`);

  console.log(`\n=== product postmeta field frequency (top 40, out of ${productIds.size} products) ===`);
  const sortedMeta = [...metaKeyCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
  for (const [key, count] of sortedMeta) {
    const sample = metaSamples.get(key) ?? "";
    console.log(`  ${String(count).padStart(6)}  ${key}${sample ? `  (e.g. "${sample}")` : ""}`);
  }

  console.log(`\nTotal distinct postmeta keys found on products: ${metaKeyCounts.size}`);
  console.log(`Total wp_posts rows scanned: ${[...postTypeCounts.values()].reduce((a, b) => a + b, 0)}`);
}

main().catch((err) => {
  console.error("Analysis failed:", err);
  process.exit(1);
});
