#!/usr/bin/env node
/**
 * One-off uploader for the real catalogue PDF into Supabase Storage's
 * `media` bucket (the same bucket every other real image asset on the site
 * uses). The file itself is never committed to the repo — 500+ pages /
 * 50MB+ is far too large for git, and would bloat every clone/deploy.
 *
 * Run from the project root, with a real SUPABASE_SERVICE_ROLE_KEY in
 * .env.local (the anon key does not have upload permission on this bucket):
 *
 *   node scripts/upload-catalogue.js "C:\path\to\Sooriya-Catalogue.pdf"
 *
 * Re-run any time the catalogue is updated — `upsert: true` overwrites the
 * existing file at the same path, so the URL the site links to never
 * changes.
 */
const fs = require("fs");
const path = require("path");

const STORAGE_PATH = "brochures/sooriya-catalogue.pdf";

function loadEnvLocal(envPath) {
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node scripts/upload-catalogue.js <path-to-pdf>");
    process.exit(1);
  }

  const env = loadEnvLocal(path.join(process.cwd(), ".env.local"));
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is missing from .env.local — the anon key can't upload here.");
    process.exit(1);
  }

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const fileBuffer = fs.readFileSync(filePath);
  console.log(`Uploading ${filePath} (${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB) to media/${STORAGE_PATH} ...`);

  const { data, error } = await supabase.storage.from("media").upload(STORAGE_PATH, fileBuffer, {
    contentType: "application/pdf",
    cacheControl: "31536000",
    upsert: true,
  });

  if (error) {
    console.error("Upload failed:", error.message);
    process.exit(1);
  }

  console.log("Uploaded:", data.path);
  console.log("Public URL:", `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${data.path}`);
}

main().catch((err) => {
  console.error("Script error:", err.message);
  process.exit(1);
});
