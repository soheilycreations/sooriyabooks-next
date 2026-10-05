import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { createClient } from "@/lib/supabase/server";
import { r2KeyFor } from "@/lib/media/url";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Uploaded objects always get a unique (uuid) key, so a one-year immutable
 * cache can never go stale: replacing an image means a new key, never an
 * overwrite.
 */
const CACHE_CONTROL = "public, max-age=31536000, immutable";

function bucket(): MediaBucket {
  return getCloudflareContext().env.MEDIA;
}

export async function putMedia(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  await bucket().put(key, body, { httpMetadata: { contentType, cacheControl: CACHE_CONTROL } });
}

/** Deletes objects by storage_path (legacy .jpg/.png product paths resolve to their migrated .webp key). A failure is logged, not thrown: a leaked object is better than a failed admin action. */
export async function removeMediaObjects(storagePaths: string[]): Promise<void> {
  const keys = [...new Set(storagePaths.map(r2KeyFor))];
  if (keys.length === 0) return;
  try {
    await bucket().delete(keys);
  } catch (err) {
    console.error("[media] R2 delete failed", keys.length, err);
  }
}

/**
 * Deletes the given media_assets rows — and their R2 objects — but only those
 * nothing references any more: book_images, blog_posts.cover_media_id and
 * homepage_section_items.image_media_id. (book_images cascades on delete, so
 * deleting a still-used asset would silently strip it from other books.)
 */
export async function deleteOrphanedMedia(supabase: SupabaseServerClient, mediaIds: string[]): Promise<void> {
  const ids = [...new Set(mediaIds)];
  if (ids.length === 0) return;

  const [images, posts, sections] = await Promise.all([
    supabase.from("book_images").select("media_id").in("media_id", ids),
    supabase.from("blog_posts").select("cover_media_id").in("cover_media_id", ids),
    supabase.from("homepage_section_items").select("image_media_id").in("image_media_id", ids),
  ]);
  // If any lookup failed we can't prove the media is unused — keep everything.
  if (images.error || posts.error || sections.error) return;

  const inUse = new Set<string>([
    ...(images.data ?? []).map((r) => r.media_id),
    ...(posts.data ?? []).map((r) => r.cover_media_id).filter((v): v is string => !!v),
    ...(sections.data ?? []).map((r) => r.image_media_id).filter((v): v is string => !!v),
  ]);
  const orphanIds = ids.filter((id) => !inUse.has(id));
  if (orphanIds.length === 0) return;

  const { data: assets } = await supabase.from("media_assets").select("id, storage_path").in("id", orphanIds);
  if (!assets || assets.length === 0) return;

  const { error } = await supabase.from("media_assets").delete().in("id", orphanIds);
  if (error) return; // row still exists, so keep its file
  await removeMediaObjects(assets.map((a) => a.storage_path));
}
