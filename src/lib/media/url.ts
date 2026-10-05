/**
 * The one place that turns a `media_assets.storage_path` into a public URL.
 * Pure (no server-only imports) so server and client components can share it.
 *
 * Media lives in Cloudflare R2 behind NEXT_PUBLIC_MEDIA_BASE_URL
 * (https://media.sooriyabooks.lk). If that variable isn't set — local dev, or a
 * deploy before the cutover — URLs fall back to the old Supabase Storage
 * public path, so an unconfigured build behaves exactly as before.
 */

const SUPABASE_PUBLIC_PATH = "/storage/v1/object/public/media/";

/**
 * Covers migrated to R2 are WebP, but `media_assets` rows written before the
 * migration still say .jpg/.jpeg/.png. Mapping them here keeps the site
 * correct whether or not the database UPDATE has run yet, so the deploy and
 * the SQL can happen in either order with no broken-image window.
 */
export function r2KeyFor(storagePath: string): string {
  return storagePath.startsWith("products/") ? storagePath.replace(/\.(jpe?g|png)$/i, ".webp") : storagePath;
}

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

export function mediaUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/+$/, "");
  if (base) return `${base}/${encodePath(r2KeyFor(storagePath))}`;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}${SUPABASE_PUBLIC_PATH}${storagePath}`;
}

/** Recovers the storage path from a URL built by mediaUrl() or the old Supabase builder; null for anything else. */
export function storagePathFromUrl(url: string): string | null {
  const i = url.indexOf(SUPABASE_PUBLIC_PATH);
  if (i !== -1) return decodeURIComponent(url.slice(i + SUPABASE_PUBLIC_PATH.length));
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/+$/, "");
  if (base && url.startsWith(`${base}/`)) return decodeURIComponent(url.slice(base.length + 1));
  return null;
}
