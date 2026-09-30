#!/usr/bin/env node
/**
 * Re-uploads the actual image BYTES to Supabase Storage for books whose
 * media_assets/book_images DB rows already exist (migrated from the OLD
 * project's database) but whose Storage objects don't — e.g. when moving
 * to a brand-new Supabase project via a direct Postgres data copy, which
 * carries over table rows but not Storage bucket contents.
 *
 * Does NOT touch media_assets or book_images rows — those are assumed
 * already correct. Only uploads to the storage_path each row already
 * points at, sourced from the local WordPress dump + wp-content/uploads
 * (the same source migrate-images.mjs used originally).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node scripts/etl/fix-storage-files.mjs [--dry-run]
 */
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { streamDumpRows } from "./dump-parser.mjs";
import { mimeTypeForFile } from "./mime.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DUMP_PATH = process.env.WP_DUMP_PATH || path.resolve(__dirname, "../../../../u930615978_FX4fE.sooriyabooks-lk.20260731090448.sql/u930615978_FX4fE.sql");
const UPLOADS_DIR = process.env.WP_UPLOADS_DIR || path.resolve(__dirname, "../../../u930615978.sooriyabooks-lk.20260731090448/domains/sooriyabooks.lk/public_html/wp-content/uploads");

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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log(`Reading dump: ${DUMP_PATH}`);
  console.log(DRY_RUN ? "Mode: DRY RUN\n" : "Mode: REAL RUN — uploading Storage objects only.\n");

  const posts = new Map();
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

  const books = await fetchAllRows(supabase, "books", "id, slug");
  const slugToBookId = new Map(books.map((b) => [b.slug, b.id]));
  console.log(`Fetched ${books.length} books.`);

  const bookImages = await fetchAllRows(supabase, "book_images", "book_id, media_id");
  const mediaAssets = await fetchAllRows(supabase, "media_assets", "id, storage_path");
  const mediaById = new Map(mediaAssets.map((m) => [m.id, m]));
  const storagePathByBookId = new Map();
  for (const bi of bookImages) {
    const media = mediaById.get(bi.media_id);
    if (media) storagePathByBookId.set(bi.book_id, media.storage_path);
  }
  console.log(`${storagePathByBookId.size} books have a media_assets/book_images row already.\n`);

  const stats = { noStoragePath: 0, noThumbnailMeta: 0, fileNotFoundLocally: 0, unsupportedMimeType: 0, uploaded: 0, failed: [] };
  const workList = [];

  for (const [postId, post] of posts) {
    const bookId = slugToBookId.get(post.slug);
    if (!bookId) continue;
    const storagePath = storagePathByBookId.get(bookId);
    if (!storagePath) {
      stats.noStoragePath++;
      continue;
    }

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

    workList.push({ bookId, title: post.title, storagePath, localPath, mimeType });
  }

  console.log(`${"=".repeat(70)}`);
  console.log("STORAGE FILE REPAIR REPORT");
  console.log("=".repeat(70));
  console.log(`No storage_path on this book:      ${stats.noStoragePath}`);
  console.log(`No thumbnail/attachment metadata:  ${stats.noThumbnailMeta}`);
  console.log(`Thumbnail file not found locally:  ${stats.fileNotFoundLocally}`);
  console.log(`Unsupported/unrecognized MIME:      ${stats.unsupportedMimeType}`);
  console.log(`Ready to upload: ${workList.length}\n`);

  if (DRY_RUN) {
    for (const item of workList.slice(0, 8)) {
      console.log(`  book ${item.bookId} "${item.title}" -> ${item.storagePath} <- ${item.localPath}`);
    }
    console.log(`\nDry run complete — nothing uploaded.`);
    return;
  }

  for (const item of workList) {
    try {
      const fileBuffer = await readFile(item.localPath);
      const { error: uploadError } = await supabase.storage.from("media").upload(item.storagePath, fileBuffer, {
        upsert: true,
        contentType: item.mimeType,
      });
      if (uploadError) {
        stats.failed.push({ bookId: item.bookId, title: item.title, message: uploadError.message });
        continue;
      }
      stats.uploaded++;
      if (stats.uploaded % 200 === 0) console.log(`  ... ${stats.uploaded}/${workList.length} uploaded`);
    } catch (err) {
      stats.failed.push({ bookId: item.bookId, title: item.title, message: err instanceof Error ? err.message : String(err) });
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("STORAGE FILE REPAIR COMPLETE");
  console.log("=".repeat(70));
  console.log(`Uploaded successfully: ${stats.uploaded} / ${workList.length}`);
  console.log(`Failed:                ${stats.failed.length}`);
  if (stats.failed.length > 0) {
    for (const f of stats.failed.slice(0, 30)) console.log(`  ${f.bookId} "${f.title}": ${f.message}`);
    if (stats.failed.length > 30) console.log(`  ...and ${stats.failed.length - 30} more`);
    console.log(`\nRe-run this same command to retry failures — upsert:true means re-running is always safe.`);
  }
}

main().catch((err) => {
  console.error("Storage file repair failed:", err);
  process.exit(1);
});
