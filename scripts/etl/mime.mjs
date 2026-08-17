import path from "node:path";

/**
 * Extension -> MIME type, matching the "media" storage bucket's
 * allowed_mime_types exactly (supabase/migrations/0008_admin_policies.sql).
 * Supabase's storage client defaults an un-typed upload (e.g. a raw Node
 * Buffer, which has no inherent MIME type the way a browser File/Blob
 * does) to 'text/plain;charset=UTF-8' — which the bucket's MIME
 * allow-list then rejects for every image. Never upload without passing
 * this explicitly as `contentType`.
 */
const EXT_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/** Returns the correct MIME type for a filename, or null if unrecognized (never guess/default). */
export function mimeTypeForFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_TO_MIME[ext] ?? null;
}
