# Cover migration: Supabase Storage -> Cloudflare R2

One-off tooling, isolated from the app (its own `package.json`; nothing here is
imported by `src/` or built by Cloudflare). Run everything from this folder.

```bash
npm install
```

## 1. Convert (local only, no network)

Reads each product's original cover from the local WordPress backup, resizes to
fit 800x800, encodes WebP q78 -> `../../../r2-media-out/products/<wpPostId>.webp`
and writes `manifest.json`. Resumable; safe to Ctrl+C and re-run.

```bash
node convert.mjs --sample 50 --out ../../../r2-media-out-test   # try 50 random covers
node convert.mjs                                                 # all of them
```

## 2. Upload (needs R2 credentials + a books.csv export)

Export `books` (columns `id`, `slug`) from the Supabase Table Editor, and
optionally `media_assets` (column `storage_path`) so rollback uses the real
old values. Then:

```bash
node upload.mjs --books <books.csv> --media-assets <media_assets.csv> --dry-run   # plan only
node upload.mjs --books <books.csv> --media-assets <media_assets.csv>             # upload
```

Credentials come from environment variables (never commit them):
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.

Objects get `Cache-Control: public, max-age=31536000, immutable` and
`Content-Type: image/webp`. Output in the out folder:

- `upload-manifest.json` per-cover result (book id, R2 key, old path, bytes)
- `unmatched.json` covers with no book, books with no converted cover
- `sql/update-media-assets.sql` repoints `media_assets` at the `.webp` keys
- `sql/rollback-media-assets.sql` restores the original paths

Review the SQL and run it yourself in the Supabase SQL editor only after the
objects are confirmed in R2. This tooling never writes to Supabase.
