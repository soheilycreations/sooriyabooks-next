/**
 * Browser-side image compression for admin uploads. Shrinks a photo to fit
 * within `maxPx` and re-encodes it as WebP before it ever leaves the admin's
 * machine — a 3 MB phone photo becomes ~40-150 KB. GIFs and SVGs pass through
 * untouched (re-encoding would drop an animation / rasterize a vector).
 *
 * Never throws: if anything about compression fails the original file is
 * returned, and the server's own size/type validation decides what happens.
 */
export async function compressForUpload(file: File, maxPx = 800, quality = 0.78): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const toBlob = (type: string, q: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));
    let blob = await toBlob("image/webp", quality);
    // Some browsers can't encode WebP and silently return PNG — use JPEG then.
    if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg", 0.82);
    if (!blob) return file;

    // Already small and not resized? Keep the original rather than re-encode it larger.
    if (scale === 1 && blob.size >= file.size) return file;

    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.${ext}`, { type: blob.type });
  } catch {
    return file;
  }
}
