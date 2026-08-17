"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/auth/actions";

export interface UploadedMedia {
  id: string;
  url: string;
  storagePath: string;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);

function publicUrlFor(storagePath: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${storagePath}`;
}

/** Uploads a single image file (from a client-built FormData) to Supabase Storage + records it in media_assets. */
export async function uploadMedia(formData: FormData): Promise<ActionResult<UploadedMedia>> {
  await requireStaff();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { ok: false, error: "No file provided" };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Unsupported file type — use JPEG, PNG, WebP, GIF, or SVG" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "File is too large (max 10MB)" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ext = file.name.split(".").pop() || "bin";
  const storagePath = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("media").upload(storagePath, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (uploadError) {
    return { ok: false, error: uploadError.message };
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
    await supabase.storage.from("media").remove([storagePath]);
    return { ok: false, error: dbError?.message || "Could not save media record" };
  }

  return { ok: true, data: { id: asset.id, url: publicUrlFor(storagePath), storagePath } };
}

export async function deleteMedia(id: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { data: asset } = await supabase.from("media_assets").select("storage_path").eq("id", id).maybeSingle();
  if (!asset) return { ok: false, error: "Media not found" };

  await supabase.storage.from("media").remove([asset.storage_path]);
  const { error } = await supabase.from("media_assets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

export async function listMedia(limit = 60) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("media_assets")
    .select("id, storage_path, alt_text, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((m) => ({ id: m.id, url: publicUrlFor(m.storage_path), altText: m.alt_text, createdAt: m.created_at }));
}
