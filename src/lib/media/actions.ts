"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media/url";
import { putMedia, removeMediaObjects } from "@/lib/media/storage";
import type { ActionResult } from "@/lib/auth/actions";

export interface UploadedMedia {
  id: string;
  url: string;
  storagePath: string;
}

// The admin UI compresses images in the browser (src/lib/media/compress-client.ts)
// before uploading, so a real upload is ~40-150 KB. This ceiling is the backstop
// for when that step is skipped or fails (GIF/SVG pass through uncompressed).
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

/** Uploads a single image (from a client-built FormData) to R2 under a unique name + records it in media_assets. */
export async function uploadMedia(formData: FormData): Promise<ActionResult<UploadedMedia>> {
  await requireStaff();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { ok: false, error: "No file provided" };
  }
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return { ok: false, error: "Unsupported file type — use JPEG, PNG, WebP, GIF, or SVG" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "File is too large (max 2MB after compression)" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unique key, derived from the validated MIME type (never the client's filename).
  const storagePath = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;

  try {
    await putMedia(storagePath, await file.arrayBuffer(), file.type);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not store the file" };
  }

  const { data: asset, error: dbError } = await supabase
    .from("media_assets")
    .insert({
      kind: "image",
      storage_path: storagePath,
      alt_text: file.name,
      uploaded_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (dbError || !asset) {
    await removeMediaObjects([storagePath]);
    return { ok: false, error: dbError?.message || "Could not save media record" };
  }

  return { ok: true, data: { id: asset.id, url: mediaUrl(storagePath), storagePath } };
}

export async function deleteMedia(id: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { data: asset } = await supabase.from("media_assets").select("storage_path").eq("id", id).maybeSingle();
  if (!asset) return { ok: false, error: "Media not found" };

  // Row first: if the delete fails, the file must stay.
  const { error } = await supabase.from("media_assets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await removeMediaObjects([asset.storage_path]);
  return { ok: true, data: undefined };
}

export async function listMedia(limit = 60) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("media_assets")
    .select("id, storage_path, alt_text, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((m) => ({ id: m.id, url: mediaUrl(m.storage_path), altText: m.alt_text, createdAt: m.created_at }));
}
