#!/usr/bin/env node
/**
 * Phase 2 of the cover migration: upload the WebP files made by convert.mjs to
 * Cloudflare R2 under their FINAL keys (products/<bookId>.webp), and generate
 * the SQL that repoints media_assets at them, plus a rollback.
 *
 * Needs a books.csv exported from Supabase (Table Editor -> books -> Export,
 * columns "id" and "slug" are required). Optionally also media_assets.csv, so
 * the "old path" in the rollback SQL is the real stored value rather than one
 * derived from the original file extension.
 *
 * Nothing here touches Supabase: it only reads those CSV files. The generated
 * SQL is for YOU to review and run in the Supabase SQL editor, after
 * confirming the objects are in R2.
 *
 * Resumable: an object already in R2 with the same byte size is skipped.
 *
 * Env (not needed with --dry-run): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 *   R2_SECRET_ACCESS_KEY, R2_BUCKET
 *
 * Usage (from scripts/r2):
 *   node upload.mjs --books ../../../books.csv --dry-run
 *   node upload.mjs --books ../../../books.csv --media-assets ../../../media_assets.csv
 * Flags: --out <dir> --books <csv> --media-assets <csv> --concurrency <n> --dry-run
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : true;
}

const OUT = path.resolve(String(arg("out", path.join(ROOT, "r2-media-out"))));
const BOOKS_CSV = arg("books", null);
const MEDIA_CSV = arg("media-assets", null);
const CONCURRENCY = Number(arg("concurrency", 8)) || 8;
const DRY_RUN = arg("dry-run", false) === true;
const CACHE_CONTROL = "public, max-age=31536000, immutable";

/** Minimal RFC-4180 CSV parser (quoted fields, doubled quotes, CRLF). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i]])));
}

async function readCsv(file, required) {
  const rows = parseCsv((await readFile(path.resolve(String(file)), "utf8")).replace(/^﻿/, ""));
  for (const col of required) {
    if (!rows.length || !(col in rows[0])) {
      console.error(`${file} must have a "${col}" column (found: ${rows[0] ? Object.keys(rows[0]).join(", ") : "empty file"}).`);
      process.exit(1);
    }
  }
  return rows;
}

const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;

function updateSql(title, pairs) {
  const chunks = [];
  for (let i = 0; i < pairs.length; i += 1000) chunks.push(pairs.slice(i, i + 1000));
  const body = chunks
    .map(
      (c) =>
        `update public.media_assets m set storage_path = v.new_path\nfrom (values\n${c
          .map(([o, n]) => `  (${sqlStr(o)}, ${sqlStr(n)})`)
          .join(",\n")}\n) as v(old_path, new_path)\nwhere m.storage_path = v.old_path;`,
    )
    .join("\n\n");
  return `-- ${title}\n-- ${pairs.length} rows. Each statement should report UPDATE <n> matching its row count.\nbegin;\n\n${body}\n\ncommit;\n`;
}

async function main() {
  if (!BOOKS_CSV) {
    console.error("Pass --books <books.csv> (an export of Supabase's books table with id and slug columns).");
    process.exit(1);
  }
  const manifestPath = path.join(OUT, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error(`No manifest at ${manifestPath}. Run convert.mjs first.`);
    process.exit(1);
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const converted = Object.values(manifest.items).filter((i) => i.status === "ok");

  const books = await readCsv(BOOKS_CSV, ["id", "slug"]);
  const slugToId = new Map();
  const dupSlugs = new Set();
  for (const b of books) {
    if (slugToId.has(b.slug)) dupSlugs.add(b.slug);
    slugToId.set(b.slug, b.id);
  }

  const oldPathByBook = new Map();
  if (MEDIA_CSV) {
    for (const m of await readCsv(MEDIA_CSV, ["storage_path"])) {
      const hit = /^products\/([0-9a-f-]{36})\.[A-Za-z0-9]+$/.exec(m.storage_path ?? "");
      if (hit) oldPathByBook.set(hit[1], m.storage_path);
    }
  }

  const plan = [];
  const unmatched = [];
  for (const item of converted) {
    const bookId = slugToId.get(item.slug);
    if (!bookId || dupSlugs.has(item.slug)) {
      unmatched.push(item);
      continue;
    }
    const derivedOld = `products/${bookId}${path.extname(item.src) || ".jpg"}`;
    plan.push({
      postId: item.postId,
      slug: item.slug,
      bookId,
      key: `products/${bookId}.webp`,
      localFile: path.join(OUT, item.out),
      bytes: item.outBytes,
      oldPath: oldPathByBook.get(bookId) ?? derivedOld,
      oldPathSource: oldPathByBook.has(bookId) ? "media_assets.csv" : "derived from original extension",
    });
  }
  const plannedBookIds = new Set(plan.map((p) => p.bookId));
  const booksWithoutCover = books.filter((b) => !plannedBookIds.has(b.id));

  console.log(`Converted covers in manifest: ${converted.length}`);
  console.log(`Books in CSV:                 ${books.length}`);
  console.log(`Matched to a book (to upload): ${plan.length}`);
  console.log(`Covers with no matching book:  ${unmatched.length}${dupSlugs.size ? `  (${dupSlugs.size} duplicate slugs in CSV were skipped)` : ""}`);
  console.log(`Books with no converted cover: ${booksWithoutCover.length}  (admin-created books, or covers that were missing locally)`);

  await mkdir(path.join(OUT, "sql"), { recursive: true });
  await writeFile(
    path.join(OUT, "unmatched.json"),
    JSON.stringify({ coversWithNoBook: unmatched.map((u) => ({ postId: u.postId, slug: u.slug, src: u.src })), booksWithoutCover: booksWithoutCover.map((b) => ({ id: b.id, slug: b.slug })) }, null, 1),
  );

  const results = [];
  if (DRY_RUN) {
    console.log("\nDRY RUN: nothing uploaded. Showing the first 3 planned keys:");
    for (const p of plan.slice(0, 3)) console.log(`  ${p.localFile} -> ${p.key}   (old: ${p.oldPath})`);
    for (const p of plan) results.push({ ...p, status: "planned" });
  } else {
    for (const v of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]) {
      if (!process.env[v]) {
        console.error(`Set ${v} (see the README for where to find it).`);
        process.exit(1);
      }
    }
    const { S3Client, HeadObjectCommand, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
    });
    const Bucket = process.env.R2_BUCKET;

    const queue = [...plan];
    let n = 0;
    async function worker() {
      while (queue.length) {
        const p = queue.shift();
        try {
          let exists = false;
          try {
            const head = await s3.send(new HeadObjectCommand({ Bucket, Key: p.key }));
            exists = head.ContentLength === p.bytes;
          } catch {
            exists = false;
          }
          if (exists) {
            results.push({ ...p, status: "already-there" });
          } else {
            await s3.send(
              new PutObjectCommand({
                Bucket,
                Key: p.key,
                Body: await readFile(p.localFile),
                ContentType: "image/webp",
                CacheControl: CACHE_CONTROL,
              }),
            );
            results.push({ ...p, status: "uploaded" });
          }
        } catch (err) {
          results.push({ ...p, status: "error", reason: err instanceof Error ? err.message : String(err) });
        }
        if (++n % 200 === 0) console.log(`  ... ${n}/${plan.length}`);
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }

  await writeFile(path.join(OUT, "upload-manifest.json"), JSON.stringify(results, null, 1));

  // Only rows whose object is confirmed in R2 (or, for a dry run, planned) get SQL.
  const good = results.filter((r) => ["uploaded", "already-there", "planned"].includes(r.status));
  const pairs = good.map((r) => [r.oldPath, r.key]);
  await writeFile(path.join(OUT, "sql", "update-media-assets.sql"), updateSql("Repoint media_assets at the R2 .webp objects. REVIEW, then run in the Supabase SQL editor.", pairs));
  await writeFile(path.join(OUT, "sql", "rollback-media-assets.sql"), updateSql("ROLLBACK: restore the original media_assets paths.", pairs.map(([o, n]) => [n, o])));

  const count = (s) => results.filter((r) => r.status === s).length;
  console.log(`\nUploaded: ${count("uploaded")}   Already in R2: ${count("already-there")}   Errors: ${count("error")}${DRY_RUN ? `   Planned: ${count("planned")}` : ""}`);
  const derived = good.filter((g) => g.oldPathSource !== "media_assets.csv").length;
  if (derived) console.log(`Note: ${derived} old paths were derived from the original file extension. Pass --media-assets media_assets.csv to use the real stored values.`);
  console.log(`\nWrote to ${OUT}:\n  upload-manifest.json\n  unmatched.json\n  sql/update-media-assets.sql\n  sql/rollback-media-assets.sql`);
  if (count("error")) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
