#!/usr/bin/env node
/**
 * Category parent-link retry.
 *
 * Scope: ONLY updates `categories.parent_id`. Never touches books,
 * inventory, prices, book_categories, authors, publishers, or images —
 * those already migrated successfully and are not re-run or modified by
 * this script.
 *
 * Why this exists: migrate.mjs's original category import upserted each
 * WordPress product_cat term as { name, slug } only — it never read
 * wp_term_taxonomy.parent, so every imported category ended up top-level
 * regardless of its real WordPress hierarchy (e.g. "Translations" should
 * be a child of "Sooriya Books" but wasn't linked at all). Fixed in
 * migrate.mjs for any future fresh run; this script retries just the
 * parent-linking step against the already-imported categories table by
 * matching on slug (which migrate.mjs derives identically).
 *
 * Safe to run repeatedly: it only ever sets parent_id from the dump's
 * actual wp_term_taxonomy.parent value, and re-running just re-applies
 * the same links.
 *
 * --dry-run needs only NEXT_PUBLIC_SUPABASE_URL + a readable key (the
 * public anon key is enough — categories is publicly readable via RLS)
 * since it only reads to report what WOULD change. Never writes.
 *
 * A real run needs SUPABASE_SERVICE_ROLE_KEY (RLS restricts categories
 * writes to staff, and this script runs unauthenticated as a script, not
 * a logged-in staff user).
 *
 * Usage:
 *   node scripts/etl/fix-category-parents.mjs --dry-run
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node scripts/etl/fix-category-parents.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { streamDumpRows } from "./dump-parser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_DUMP_PATH = path.resolve(
  __dirname,
  "../../../u930615978_FX4fE.sooriyabooks-lk.20260731090448.sql/u930615978_FX4fE.sql",
);
const DUMP_PATH = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) || process.env.WP_DUMP_PATH || DEFAULT_DUMP_PATH;
const DRY_RUN = process.argv.includes("--dry-run");

const WP_TERMS_COLS = ["term_id", "name", "slug", "term_group"];
const WP_TERM_TAXONOMY_COLS = ["term_taxonomy_id", "term_id", "taxonomy", "description", "parent", "count"];

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

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY for a real run, or NEXT_PUBLIC_SUPABASE_ANON_KEY for --dry-run).");
    process.exit(1);
  }
  const key = DRY_RUN
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!DRY_RUN && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("A real (non-dry-run) invocation needs SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Reading dump: ${DUMP_PATH}`);
  console.log(DRY_RUN ? "Mode: DRY RUN — no writes.\n" : "Mode: REAL RUN — will update categories.parent_id.\n");

  const terms = new Map(); // term_id -> { name, slug }
  const taxonomyByTTId = new Map(); // term_taxonomy_id -> { term_id, taxonomy, parent }

  await streamDumpRows(DUMP_PATH, ["wp_terms", "wp_term_taxonomy"], (table, values) => {
    if (table === "wp_terms") {
      const t = rowToObject(WP_TERMS_COLS, values);
      terms.set(t.term_id, { name: t.name, slug: t.slug });
    } else if (table === "wp_term_taxonomy") {
      const tt = rowToObject(WP_TERM_TAXONOMY_COLS, values);
      taxonomyByTTId.set(tt.term_taxonomy_id, { term_id: tt.term_id, taxonomy: tt.taxonomy, parent: tt.parent });
    }
  });

  // wp term_id -> derived slug, for product_cat terms only.
  const catTermIdToSlug = new Map();
  for (const tt of taxonomyByTTId.values()) {
    if (tt.taxonomy !== "product_cat") continue;
    const term = terms.get(tt.term_id);
    if (!term) continue;
    catTermIdToSlug.set(tt.term_id, term.slug || slugify(term.name));
  }

  // Load the already-imported categories table (slug -> supabase id).
  const { data: existingCategories, error: fetchError } = await supabase.from("categories").select("id, slug, parent_id");
  if (fetchError) {
    console.error("Failed to read categories table:", fetchError.message);
    process.exit(1);
  }
  const slugToCategory = new Map(existingCategories.map((c) => [c.slug, c]));

  let linked = 0;
  let alreadyLinked = 0;
  let skippedNoMatch = 0;

  for (const tt of taxonomyByTTId.values()) {
    if (tt.taxonomy !== "product_cat" || !tt.parent || tt.parent === "0") continue;
    const childSlug = catTermIdToSlug.get(tt.term_id);
    const parentSlug = catTermIdToSlug.get(tt.parent);
    if (!childSlug || !parentSlug) continue;

    const child = slugToCategory.get(childSlug);
    const parent = slugToCategory.get(parentSlug);
    if (!child || !parent || child.id === parent.id) {
      skippedNoMatch++;
      continue;
    }
    if (child.parent_id === parent.id) {
      alreadyLinked++;
      continue;
    }

    console.log(`  ${childSlug} -> parent ${parentSlug}`);
    if (DRY_RUN) {
      linked++;
      continue;
    }
    const { error } = await supabase.from("categories").update({ parent_id: parent.id }).eq("id", child.id);
    if (error) {
      console.error(`  ! Failed to link ${childSlug} -> ${parentSlug}:`, error.message);
      continue;
    }
    linked++;
  }

  console.log(`\nDone. Linked: ${linked}, already linked: ${alreadyLinked}, skipped (no matching row): ${skippedNoMatch}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
