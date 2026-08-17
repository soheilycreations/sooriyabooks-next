#!/usr/bin/env node
/**
 * Read-only analysis pass over the legacy WordPress SQL dump. Run this
 * BEFORE `migrate.mjs` — it never writes to Supabase or touches the dump
 * file. Reports what's actually in the dump (taxonomy names, product/term
 * counts, sample rows) so the transform logic in migrate.mjs can be
 * verified against reality rather than assumed, per docs/migration-plan.md.
 *
 * Usage: node scripts/etl/analyze.mjs [path-to-dump.sql]
 */
import { streamDumpRows } from "./dump-parser.mjs";

const DUMP_PATH =
  process.argv[2] ||
  process.env.WP_DUMP_PATH ||
  "../../../u930615978_FX4fE.sooriyabooks-lk.20260731090448.sql/u930615978_FX4fE.sql";

// Standard WordPress 6.x column order (verify against `SHOW CREATE TABLE`
// in the dump if this project's schema ever diverges from stock WP).
const WP_POSTS_COLS = [
  "ID", "post_author", "post_date", "post_date_gmt", "post_content", "post_title", "post_excerpt",
  "post_status", "comment_status", "ping_status", "post_password", "post_name", "to_ping", "pinged",
  "post_modified", "post_modified_gmt", "post_content_filtered", "post_parent", "guid", "menu_order",
  "post_type", "post_mime_type", "comment_count",
];
const WP_TERM_TAXONOMY_COLS = ["term_taxonomy_id", "term_id", "taxonomy", "description", "parent", "count"];
const WP_TERMS_COLS = ["term_id", "name", "slug", "term_group"];

function rowToObject(cols, values) {
  const obj = {};
  cols.forEach((c, i) => (obj[c] = values[i]));
  return obj;
}

async function main() {
  console.log(`Analyzing: ${DUMP_PATH}\n`);

  const postTypeCounts = new Map();
  const taxonomyCounts = new Map();
  const sampleProducts = [];
  const sampleTerms = new Map(); // taxonomy -> [terms]
  let postCount = 0;

  await streamDumpRows(DUMP_PATH, ["wp_posts", "wp_term_taxonomy", "wp_terms"], (table, values) => {
    if (table === "wp_posts") {
      postCount++;
      const post = rowToObject(WP_POSTS_COLS, values);
      postTypeCounts.set(post.post_type, (postTypeCounts.get(post.post_type) || 0) + 1);
      if (post.post_type === "product" && sampleProducts.length < 5) {
        sampleProducts.push({ id: post.ID, title: post.post_title, slug: post.post_name, status: post.post_status });
      }
    }
    if (table === "wp_term_taxonomy") {
      const tt = rowToObject(WP_TERM_TAXONOMY_COLS, values);
      taxonomyCounts.set(tt.taxonomy, (taxonomyCounts.get(tt.taxonomy) || 0) + 1);
    }
  });

  console.log("=== post_type breakdown ===");
  for (const [type, count] of [...postTypeCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(6)}  ${type}`);
  }

  console.log("\n=== taxonomy breakdown (term_taxonomy.taxonomy) ===");
  for (const [tax, count] of [...taxonomyCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(6)}  ${tax}`);
  }
  console.log(
    "\n  ^ Look for taxonomies beyond 'product_cat'/'product_tag' — a name like",
    "'pa_author' or 'pa_publisher' (WooCommerce product attribute) or a custom",
    "taxonomy slug tells migrate.mjs where Author/Publisher data actually lives.",
    "Confirm this before running migrate.mjs — see docs/migration-plan.md.",
  );

  console.log(`\n=== sample products (post_type='product') ===`);
  for (const p of sampleProducts) console.log(`  #${p.id}  [${p.status}]  ${p.title}  (${p.slug})`);

  console.log(`\nTotal wp_posts rows scanned: ${postCount}`);
}

main().catch((err) => {
  console.error("Analysis failed:", err);
  process.exit(1);
});
