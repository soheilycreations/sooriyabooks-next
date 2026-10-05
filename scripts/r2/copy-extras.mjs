#!/usr/bin/env node
/**
 * Copies every NON-product file from Supabase Storage (bucket "media") to R2
 * under the SAME path, in its ORIGINAL format (no conversion): the admin
 * uploads under 2026/ and brochures/sooriya-catalogue.pdf.
 *
 * Read-only against Supabase (list + public download). It never deletes or
 * modifies anything in Supabase. Skips products/ (handled by convert/upload).
 *
 * Supabase credentials are read from the app's .env.local (never printed).
 * R2 credentials come from env vars (see README) and are not needed for --list.
 *
 * Cache headers: files with a unique name (uuid) get a one-year immutable
 * cache. Fixed-name files (the catalogue PDF, which is re-uploaded in place
 * when updated) get a 1-hour cache so an updated PDF actually shows up.
 *
 * Usage (from scripts/r2):
 *   node copy-extras.mjs --list     # show what would be copied, no R2 needed
 *   node copy-extras.mjs            # copy
 * Flags: --env <path to .env.local> --concurrency <n>
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : true;
}

const LIST_ONLY = arg("list", false) === true;
const ENV_PATH = path.resolve(String(arg("env", path.join(__dirname, "../../.env.local"))));
const CONCURRENCY = Number(arg("concurrency", 6)) || 6;
const UUID_NAME = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[A-Za-z0-9]+$/;

async function loadEnv(file) {
  const env = {};
  for (const line of (await readFile(file, "utf8")).split(/\r?\n/)) {
    const m = /^([A-Z_0-9]+)=(.*)$/.exec(line.trim());
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");
const mb = (n) => (n / 1024 / 1024).toFixed(2);

async function main() {
  const env = await loadEnv(ENV_PATH);
  const base = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) {
    console.error(`NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not found in ${ENV_PATH}`);
    process.exit(1);
  }
  const auth = { apikey: key, Authorization: `Bearer ${key}` };

  /** Recursively list files (not folders) under a prefix, skipping products/. */
  async function listFiles(prefix) {
    const files = [];
    for (let offset = 0; ; offset += 1000) {
      const res = await fetch(`${base}/storage/v1/object/list/media`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
      });
      if (!res.ok) throw new Error(`list "${prefix}" failed: ${res.status} ${await res.text()}`);
      const page = await res.json();
      for (const e of page) {
        const full = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.id === null) {
          if (full !== "products") files.push(...(await listFiles(full))); // a folder
        } else {
          files.push({ path: full, bytes: Number(e.metadata?.size ?? 0), mime: e.metadata?.mimetype ?? null });
        }
      }
      if (page.length < 1000) break;
    }
    return files;
  }

  const files = await listFiles("");
  const total = files.reduce((a, f) => a + f.bytes, 0);
  const byFolder = {};
  for (const f of files) {
    const top = f.path.includes("/") ? f.path.split("/")[0] : "(root)";
    byFolder[top] = byFolder[top] ?? { files: 0, bytes: 0 };
    byFolder[top].files++;
    byFolder[top].bytes += f.bytes;
  }
  console.log(`Non-product files in Supabase Storage: ${files.length}  (${mb(total)} MB)`);
  for (const [folder, v] of Object.entries(byFolder)) console.log(`  ${folder}/  ${v.files} files  ${mb(v.bytes)} MB`);
  const pdfs = files.filter((f) => f.path.endsWith(".pdf"));
  for (const p of pdfs) console.log(`  PDF: ${p.path}  ${mb(p.bytes)} MB`);
  if (LIST_ONLY) {
    console.log("\n--list: nothing copied.");
    return;
  }

  for (const v of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]) {
    if (!process.env[v]) {
      console.error(`Set ${v} in this terminal first (see README).`);
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

  const results = { copied: 0, alreadyThere: 0, failed: [] };
  const queue = [...files];
  async function worker() {
    while (queue.length) {
      const f = queue.shift();
      try {
        let there = false;
        try {
          const head = await s3.send(new HeadObjectCommand({ Bucket, Key: f.path }));
          there = head.ContentLength === f.bytes;
        } catch {
          there = false;
        }
        if (there) {
          results.alreadyThere++;
          continue;
        }
        const res = await fetch(`${base}/storage/v1/object/public/media/${encodePath(f.path)}`);
        if (!res.ok) throw new Error(`download ${res.status}`);
        const body = Buffer.from(await res.arrayBuffer());
        if (f.bytes && body.length !== f.bytes) throw new Error(`size mismatch ${body.length} vs ${f.bytes}`);
        await s3.send(
          new PutObjectCommand({
            Bucket,
            Key: f.path,
            Body: body,
            ContentType: f.mime || res.headers.get("content-type") || "application/octet-stream",
            CacheControl: UUID_NAME.test(f.path) ? "public, max-age=31536000, immutable" : "public, max-age=3600",
          }),
        );
        results.copied++;
      } catch (err) {
        results.failed.push({ path: f.path, message: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\nCopied: ${results.copied}   Already in R2: ${results.alreadyThere}   Failed: ${results.failed.length}`);
  for (const f of results.failed) console.log(`  ! ${f.path}: ${f.message}`);
  if (results.failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error("copy-extras failed:", err);
  process.exit(1);
});
