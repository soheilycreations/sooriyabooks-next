#!/usr/bin/env node
/**
 * Checks that files are really being served from the R2 custom domain:
 * 5 random converted covers (from upload-manifest.json), the catalogue PDF,
 * and any extra paths given with --path. Needs no credentials.
 *
 * Usage (from scripts/r2):
 *   node verify.mjs
 *   node verify.mjs --base https://media.sooriyabooks.lk --path 2026/some-file.jpg
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const argAll = (name) => process.argv.flatMap((a, i) => (a === `--${name}` && process.argv[i + 1] ? [process.argv[i + 1]] : []));
const BASE = (argAll("base")[0] ?? "https://media.sooriyabooks.lk").replace(/\/$/, "");
const OUT = path.resolve(argAll("out")[0] ?? path.join(ROOT, "r2-media-out"));

const manifest = JSON.parse(await readFile(path.join(OUT, "upload-manifest.json"), "utf8"));
const keys = manifest.filter((m) => ["uploaded", "already-there"].includes(m.status)).map((m) => m.key);
if (keys.length === 0) console.warn("No uploaded covers in upload-manifest.json yet (run upload.mjs first).");
const sample = [...keys].sort(() => Math.random() - 0.5).slice(0, 5);
const paths = [...sample, "brochures/sooriya-catalogue.pdf", ...argAll("path")];

let bad = 0;
for (const p of paths) {
  const url = `${BASE}/${p.split("/").map(encodeURIComponent).join("/")}`;
  try {
    const res = await fetch(url, { method: "HEAD" });
    const ok = res.status === 200;
    if (!ok) bad++;
    console.log(
      `${ok ? "OK  " : "FAIL"} ${res.status}  ${p}  ${res.headers.get("content-type") ?? ""}  ${res.headers.get("content-length") ?? "?"}B  cache: ${res.headers.get("cache-control") ?? "-"}`,
    );
  } catch (err) {
    bad++;
    console.log(`FAIL ERR  ${p}  ${err instanceof Error ? err.message : err}`);
  }
}
console.log(bad ? `\n${bad} of ${paths.length} checks failed.` : `\nAll ${paths.length} checks returned HTTP 200.`);
if (bad) process.exitCode = 1;
