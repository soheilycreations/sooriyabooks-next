#!/usr/bin/env node
/**
 * Image-only retry migration.
 *
 * Scope: ONLY writes to `media_assets`, `book_images`, and Supabase
 * Storage. Never touches books, inventory, prices, categories, authors,
 * or publishers — those already migrated successfully and are not
 * re-run or modified by this script.
 *
 * Why this exists: the main migrate.mjs run imported 4,820 books/
 * inventory rows correctly, but every image upload failed with
 * "mime type text/plain;charset=UTF-8 is not supported" — the upload
 * call never set an explicit contentType, and Supabase's storage client
 * defaults an untyped Buffer to text/plain, which the bucket's MIME
 * allow-list then rejects. Fixed in mime.mjs / migrate.mjs for any
 * future fresh run; this script retries just the image step against the
 * already-imported catalog.
 *
 * Safe to run repeatedly: it queries Supabase for which books already
 * have a book_images row and skips them — never re-uploads, never
 * creates a duplicate media_assets/book_images row for a book that
 * already succeeded. Re-running after a partial failure just picks up
 * the remaining/failed books.
 *
 * --dry-run needs only NEXT_PUBLIC_SUPABASE_URL + a readable key (the
 * public anon key is enough — books/book_images are publicly readable
 * via RLS) since it only reads to count what WOULD happen. Never writes,
 * never uploads, never needs the service-role key.
 *
 * A real run needs SUPABASE_SERVICE_ROLE_KEY (RLS restricts
 * media_assets/book_images writes and the storage bucket to staff, and
 * this script runs unauthenticated as a script, not a logged-in staff
 * user).
 *
 * Usage:
 *   node scripts/etl/migrate-images.mjs --dry-run
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node scripts/etl/migrate-images.mjs
 */
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { streamDumpRows } from "./dump-parser.mjs";
import { mimeTypeForFile } from "./mime.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_DUMP_PATH = path.resolve(
  __dirname,
  "../../../u930615978_FX4fE.sooriyabooks-lk.20260731090448.sql/u930615978_FX4fE.sql",
);
const DUMP_PATH = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) || process.env.WP_DUMP_PATH || DEFAULT_DUMP_PATH;

const DEFAULT_UPLOADS_DIR = path.resolve(
  __dirname,
  "../../../u930615978.sooriyabooks-lk.20260731090448/domains/sooriyabooks.lk/public_html/wp-content/uploads",
);
const UPLOADS_DIR = process.env.WP_UPLOADS_DIR || DEFAULT_UPLOADS_DIR;

const DRY_RUN = process.argv.includes("--dry-run");

const WP_POSTS_COLS = [
  "ID", "post_author", "post_date", "post_date_gmt", "post_content", "post_title", "post_excerpt",
  "post_status", "comment_status", "ping_status", "post_password", "post_name", "to_ping", "pinged",
  "post_modified", "post_modified_gmt", "post_content_filtered", "post_parent", "guid", "menu_order",
  "post_type", "post_mime_type", "comment_count",
];
const WP_POSTMETA_COLS = ["meta_id", "post_id", "meta_key", "meta_value"];

function rowToObject(cols, values) {
  const obj = {};
  cols.forEach((c, i) => (obj[c] = values[i]));
  return obj;
}

// Must exactly match migrate.mjs's slug derivation — this is how a WP
// post is matched back to the Supabase book it already became.
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

async function fetchAllRows(supabase, table, columns) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL.");
    process.exit(1);
  }

  const key = DRY_RUN ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    console.error(
      DRY_RUN
        ? "Set NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) to dry-run — books/book_images are publicly readable, no service-role key required for a dry run."
        : "Set SUPABASE_SERVICE_ROLE_KEY for a real run (writes to media_assets/book_images and the storage bucket require it).",
    );
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log(`Reading dump: ${DUMP_PATH}`);
  console.log(DRY_RUN ? "Mode: DRY RUN — read-only against Supabase, no uploads or writes.\n" : "Mode: REAL RUN — uploading images, writing media_assets/book_images only.\n");

  // ---- Parse just enough of the dump: products (slug/title) + their thumbnail attachment ----
  const posts = new Map(); // wp post ID -> { title, slug }
  const postmetaByPostId = new Map();

  await streamDumpRows(DUMP_PATH, ["wp_posts", "wp_postmeta"], (table, values) => {
    if (table === "wp_posts") {
      const p = rowToObject(WP_POSTS_COLS, values);
      if (p.post_type === "product" && p.post_status === "publish") {
        posts.set(p.ID, { title: p.post_title, slug: p.post_name || slugify(p.post_title) });
      }
    } else if (table === "wp_postmeta") {
      const m = rowToObject(WP_POSTMETA_COLS, values);
      if (!postmetaByPostId.has(m.post_id)) postmetaByPostId.set(m.post_id, {});
      postmetaByPostId.get(m.post_id)[m.meta_key] = m.meta_value;
    }
  });

  console.log(`Parsed ${posts.size} published products from the dump.`);

  // ---- Match against the already-imported books (by slug — the same key migrate.mjs upserted on) ----
  const books = await fetchAllRows(supabase, "books", "id, slug");
  const slugToBookId = new Map(books.map((b) => [b.slug, b.id]));
  console.log(`Fetched ${books.length} books already in Supabase.`);

  const existingImages = await fetchAllRows(supabase, "book_images", "book_id");
  const booksWithImages = new Set(existingImages.map((r) => r.book_id));
  console.log(`${booksWithImages.size} books already have an image — these will be skipped.\n`);

  // ---- Build the work list ----
  const stats = {
    totalBooksInSupabase: books.length,
    alreadyHasImage: booksWithImages.size,
    productNotMatchedToBook: 0, // e.g. skipped during product import (no valid price)
    noThumbnailMeta: 0,
    fileNotFoundLocally: 0,
    unsupportedMimeType: 0,
    uploaded: 0,
    failed: [],
  };
  const workList = [];

  for (const [postId, post] of posts) {
    const bookId = slugToBookId.get(post.slug);
    if (!bookId) {
      stats.productNotMatchedToBook++;
      continue;
    }
    if (booksWithImages.has(bookId)) continue; // already has a valid image — never touch it again

    const meta = postmetaByPostId.get(postId) || {};
    const thumbnailId = meta._thumbnail_id ? Number(meta._thumbnail_id) : null;
    const attachedFile = thumbnailId != null ? postmetaByPostId.get(thumbnailId)?._wp_attached_file : null;

    if (!attachedFile) {
      stats.noThumbnailMeta++;
      continue;
    }

    const localPath = path.resolve(UPLOADS_DIR, attachedFile);
    if (!(await fileExists(localPath))) {
      stats.fileNotFoundLocally++;
      continue;
    }

    const mimeType = mimeTypeForFile(attachedFile);
    if (!mimeType) {
      stats.unsupportedMimeType++;
      continue;
    }

    workList.push({ postId, bookId, title: post.title, localPath, attachedFile, mimeType });
  }

  console.log(`${"=".repeat(70)}`);
  console.log(DRY_RUN ? "DRY RUN REPORT (no uploads performed)" : "IMAGE MIGRATION");
  console.log("=".repeat(70));
  console.log(`\nTotal books already in Supabase:          ${stats.totalBooksInSupabase}`);
  console.log(`Already have a valid image (skipped):     ${stats.alreadyHasImage}`);
  console.log(`Dump product not matched to a book:       ${stats.productNotMatchedToBook}  (e.g. skipped during import — no valid price)`);
  console.log(`No thumbnail/attachment metadata:         ${stats.noThumbnailMeta}`);
  console.log(`Thumbnail file not found locally:         ${stats.fileNotFoundLocally}`);
  console.log(`Unsupported/unrecognized file type:       ${stats.unsupportedMimeType}`);
  console.log(`\nReady to upload: ${workList.length}`);

  if (DRY_RUN) {
    console.log(`\nSample of what would be uploaded (first 8):`);
    for (const item of workList.slice(0, 8)) {
      console.log(`  book ${item.bookId} "${item.title}" <- ${item.attachedFile} (${item.mimeType})`);
    }
    console.log(`\nDry run complete — no uploads performed, no rows written, no credentials beyond the public anon key were used.`);
    return;
  }

  // ---- Real run ----
  for (const item of workList) {
    try {
      const fileBuffer = await readFile(item.localPath);
      const ext = path.extname(item.attachedFile) || ".jpg";
      const storagePath = `products/${item.bookId}${ext}`;

      const { error: uploadError } = await supabase.storage.from("media").upload(storagePath, fileBuffer, {
        upsert: true,
        contentType: item.mimeType,
      });
      if (uploadError) {
        stats.failed.push({ bookId: item.bookId, title: item.title, step: "storage.upload", message: uploadError.message });
        continue;
      }

      const { data: media, error: mediaError } = await supabase
        .from("media_assets")
        .insert({ kind: "image", storage_path: storagePath, alt_text: item.title })
        .select("id")
        .single();
      if (mediaError || !media) {
        stats.failed.push({ bookId: item.bookId, title: item.title, step: "media_assets.insert", message: mediaError?.message ?? "no row returned" });
        continue;
      }

      const { error: imgError } = await supabase
        .from("book_images")
        .insert({ book_id: item.bookId, media_id: media.id, is_primary: true, sort_order: 0 });
      if (imgError) {
        stats.failed.push({ bookId: item.bookId, title: item.title, step: "book_images.insert", message: imgError.message });
        continue;
      }

      stats.uploaded++;
      if (stats.uploaded % 200 === 0) console.log(`  ... ${stats.uploaded}/${workList.length} uploaded`);
    } catch (err) {
      stats.failed.push({ bookId: item.bookId, title: item.title, step: "unexpected", message: err instanceof Error ? err.message : String(err) });
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("IMAGE MIGRATION COMPLETE");
  console.log("=".repeat(70));
  console.log(`Uploaded successfully: ${stats.uploaded} / ${workList.length}`);
  console.log(`Failed:                ${stats.failed.length}`);
  if (stats.failed.length > 0) {
    console.log(`\n--- Failures (book id, title, step, message) ---`);
    for (const f of stats.failed.slice(0, 30)) console.log(`  ${f.bookId} "${f.title}" [${f.step}]: ${f.message}`);
    if (stats.failed.length > 30) console.log(`  ...and ${stats.failed.length - 30} more`);
    console.log(`\nRe-run this same command to retry — books that already succeeded (this run or a prior one) are automatically skipped.`);
  }
}

main().catch((err) => {
  console.error("Image migration failed:", err);
  process.exit(1);
});
