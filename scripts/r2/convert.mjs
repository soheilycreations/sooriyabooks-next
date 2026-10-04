#!/usr/bin/env node
/**
 * Phase 1 of the Supabase Storage -> Cloudflare R2 cover migration.
 * LOCAL ONLY: never contacts Supabase or Cloudflare.
 *
 * Reads each published product's thumbnail from the local WordPress backup
 * (found via the SQL dump, exactly like scripts/etl/migrate-images.mjs does),
 * resizes it to fit inside 800x800, encodes WebP at quality 78, and writes
 *   <out>/products/<wpPostId>.webp
 * plus <out>/manifest.json.
 *
 * Files are named by WordPress post id here because the Supabase book id
 * (the final R2 key is products/<bookId>.webp) can't be known offline.
 * upload.mjs does that rename using a books.csv export from Supabase.
 *
 * Resumable: re-running skips items that are already converted and whose
 * source file is unchanged. The manifest is saved every 100 items and on
 * Ctrl+C. Safe to stop and restart at any point.
 *
 * Usage (from scripts/r2, after `npm install`):
 *   node convert.mjs --sample 50 --out ../../../r2-media-out-test   # test run
 *   node convert.mjs                                                 # full run
 * Flags: --out <dir> --limit <n> --sample <n> --concurrency <n> --force
 *        --dump <file.sql> --uploads <wp-content/uploads dir>
 */
import { mkdir, readFile, writeFile, rename, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { streamDumpRows } from "../etl/dump-parser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../.."); // the "Sooriyabooks" folder holding the backups

const MAX_PX = 800;
const QUALITY = 78;
const SETTINGS = { maxPx: MAX_PX, quality: QUALITY, format: "webp" };

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : true;
}

const OUT = path.resolve(String(arg("out", path.join(ROOT, "r2-media-out"))));
const DUMP = path.resolve(
  String(arg("dump", path.join(ROOT, "u930615978_FX4fE.sooriyabooks-lk.20260731090448.sql/u930615978_FX4fE.sql"))),
);
const UPLOADS = path.resolve(
  String(
    arg(
      "uploads",
      path.join(ROOT, "u930615978.sooriyabooks-lk.20260731090448/domains/sooriyabooks.lk/public_html/wp-content/uploads"),
    ),
  ),
);
const LIMIT = Number(arg("limit", 0)) || 0;
const SAMPLE = Number(arg("sample", 0)) || 0;
const CONCURRENCY = Number(arg("concurrency", 3)) || 3;
const FORCE = arg("force", false) === true;

const MANIFEST_PATH = path.join(OUT, "manifest.json");

const WP_POSTS_COLS = [
  "ID", "post_author", "post_date", "post_date_gmt", "post_content", "post_title", "post_excerpt",
  "post_status", "comment_status", "ping_status", "post_password", "post_name", "to_ping", "pinged",
  "post_modified", "post_modified_gmt", "post_content_filtered", "post_parent", "guid", "menu_order",
  "post_type", "post_mime_type", "comment_count",
];
const WP_POSTMETA_COLS = ["meta_id", "post_id", "meta_key", "meta_value"];

const rowToObject = (cols, values) => Object.fromEntries(cols.map((c, i) => [c, values[i]]));

// Must match migrate.mjs's slug derivation: it's how a WP product is tied to its Supabase book.
function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `item-${Math.random().toString(36).slice(2, 8)}`
  );
}

async function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return { version: 1, settings: SETTINGS, items: {} };
  const m = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  if (JSON.stringify(m.settings) !== JSON.stringify(SETTINGS)) {
    console.warn("Manifest was made with different settings; re-converting everything.");
    return { version: 1, settings: SETTINGS, items: {} };
  }
  return m;
}

async function saveManifest(manifest) {
  manifest.updatedAt = new Date().toISOString();
  const tmp = `${MANIFEST_PATH}.tmp`;
  await writeFile(tmp, JSON.stringify(manifest, null, 1));
  await rename(tmp, MANIFEST_PATH);
}

/** Published products and the original file each one uses as its cover. */
async function readProducts() {
  const products = new Map();
  const meta = new Map();
  await streamDumpRows(DUMP, ["wp_posts", "wp_postmeta"], (table, values) => {
    if (table === "wp_posts") {
      const p = rowToObject(WP_POSTS_COLS, values);
      if (p.post_type === "product" && p.post_status === "publish") {
        products.set(p.ID, { title: p.post_title, slug: p.post_name || slugify(p.post_title) });
      }
    } else {
      const m = rowToObject(WP_POSTMETA_COLS, values);
      if (m.meta_key === "_thumbnail_id" || m.meta_key === "_wp_attached_file") {
        if (!meta.has(m.post_id)) meta.set(m.post_id, {});
        meta.get(m.post_id)[m.meta_key] = m.meta_value;
      }
    }
  });

  const items = [];
  const skipped = { noThumbnail: 0 };
  for (const [postId, p] of products) {
    const thumbId = meta.get(postId)?._thumbnail_id;
    const file = thumbId ? meta.get(Number(thumbId))?._wp_attached_file : null;
    if (!file) {
      skipped.noThumbnail++;
      continue;
    }
    items.push({ postId: String(postId), slug: p.slug, title: p.title, src: file });
  }
  return { items, skipped, totalProducts: products.size };
}

function seededShuffle(arr, seed = 7) {
  const a = [...arr];
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function convertOne(item, manifest) {
  const srcPath = path.resolve(UPLOADS, item.src);
  const outRel = `products/${item.postId}.webp`;
  const outPath = path.join(OUT, outRel);

  let srcStat;
  try {
    srcStat = await stat(srcPath);
  } catch {
    manifest.items[item.postId] = { ...item, status: "skipped", reason: "source file missing locally" };
    return;
  }

  const prev = manifest.items[item.postId];
  if (!FORCE && prev?.status === "ok" && prev.srcBytes === srcStat.size && existsSync(outPath)) return;

  try {
    const input = await readFile(srcPath);
    const { data, info } = await sharp(input, { failOn: "none" })
      .rotate() // honour EXIF orientation before resizing
      .resize({ width: MAX_PX, height: MAX_PX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer({ resolveWithObject: true });

    await mkdir(path.dirname(outPath), { recursive: true });
    const tmp = `${outPath}.tmp`;
    await writeFile(tmp, data);
    await rename(tmp, outPath);

    manifest.items[item.postId] = {
      ...item,
      status: "ok",
      out: outRel,
      srcBytes: srcStat.size,
      outBytes: data.length,
      width: info.width,
      height: info.height,
    };
  } catch (err) {
    manifest.items[item.postId] = { ...item, status: "error", reason: err instanceof Error ? err.message : String(err) };
  }
}

const mb = (n) => (n / 1024 / 1024).toFixed(1);
const kb = (n) => (n / 1024).toFixed(0);

async function main() {
  for (const [label, p] of [["SQL dump", DUMP], ["uploads folder", UPLOADS]]) {
    if (!existsSync(p)) {
      console.error(`${label} not found: ${p}\nPass --dump / --uploads to point at it.`);
      process.exit(1);
    }
  }
  await mkdir(OUT, { recursive: true });

  console.log(`Reading products from the dump...`);
  const { items: allItems, skipped, totalProducts } = await readProducts();
  console.log(`${totalProducts} published products, ${allItems.length} with a thumbnail (${skipped.noThumbnail} without).`);

  let work = allItems;
  if (SAMPLE) work = seededShuffle(allItems).slice(0, SAMPLE);
  else if (LIMIT) work = allItems.slice(0, LIMIT);

  const manifest = await loadManifest();
  let done = 0;
  let stopping = false;
  process.on("SIGINT", () => {
    stopping = true;
    console.log("\nStopping after the current items; progress will be saved...");
  });

  const queue = [...work];
  async function worker() {
    while (queue.length && !stopping) {
      const item = queue.shift();
      await convertOne(item, manifest);
      done++;
      if (done % 100 === 0) {
        await saveManifest(manifest);
        console.log(`  ... ${done}/${work.length}`);
      }
    }
  }
  const started = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await saveManifest(manifest);

  // Summary over exactly the items this run was asked to process.
  const results = work.map((w) => manifest.items[w.postId]).filter(Boolean);
  const ok = results.filter((r) => r.status === "ok");
  const missing = results.filter((r) => r.status === "skipped");
  const errors = results.filter((r) => r.status === "error");
  const srcTotal = ok.reduce((a, r) => a + r.srcBytes, 0);
  const outTotal = ok.reduce((a, r) => a + r.outBytes, 0);
  const biggest = [...ok].sort((a, b) => b.outBytes - a.outBytes).slice(0, 5);

  console.log(`\n${"=".repeat(60)}\nCONVERT SUMMARY  (${((Date.now() - started) / 1000).toFixed(0)}s)\n${"=".repeat(60)}`);
  console.log(`Processed:           ${results.length} / ${work.length}${stopping ? "  (stopped early)" : ""}`);
  console.log(`Converted OK:        ${ok.length}`);
  console.log(`Source missing:      ${missing.length}`);
  console.log(`Errors:              ${errors.length}`);
  if (ok.length) {
    console.log(`Original total:      ${mb(srcTotal)} MB  (avg ${kb(srcTotal / ok.length)} KB)`);
    console.log(`WebP total:          ${mb(outTotal)} MB  (avg ${kb(outTotal / ok.length)} KB)`);
    console.log(`Size ratio:          ${((outTotal / srcTotal) * 100).toFixed(1)}% of original`);
    if (SAMPLE || LIMIT) {
      console.log(`Projected, all ${allItems.length} covers: ~${mb((outTotal / ok.length) * allItems.length)} MB`);
    }
    console.log(`Largest outputs:     ${biggest.map((b) => `${kb(b.outBytes)}KB`).join(", ")}`);
  }
  for (const e of [...missing, ...errors].slice(0, 10)) console.log(`  ! ${e.postId} ${e.src}: ${e.reason}`);
  console.log(`\nOutput: ${OUT}\nManifest: ${MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error("Convert failed:", err);
  process.exit(1);
});
