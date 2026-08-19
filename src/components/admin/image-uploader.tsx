"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Loader2, Star, ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadMedia } from "@/lib/media/actions";
import { MediaPickerDialog } from "./media-picker-dialog";

export interface UploadedImage {
  mediaId: string;
  url: string;
}

/**
 * Multi-image gallery manager. Two ways to add images: upload a new file,
 * or pick from the existing Media Library (media-picker-dialog.tsx, which
 * reuses listMedia() — the same query the standalone Media Library page
 * already uses, not a second implementation).
 *
 * The underlying data model is unchanged: `images[0]` is always the
 * primary/cover image (matches setBookImages() in src/lib/catalog/actions.ts,
 * which sets is_primary = index===0 on save) — "Set as cover" here just
 * reorders the array so the chosen image becomes index 0.
 */
export function ImageUploader({
  images,
  onChange,
  multiple = true,
  showMediaPicker = true,
}: {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  multiple?: boolean;
  /** Hide "Choose from Media" — e.g. on the Media Library page itself, where picking from the library while viewing it doesn't make sense. */
  showMediaPicker?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Deliberately a plain boolean, not useTransition()'s isPending: an
  // uncaught error from uploadMedia() (a thrown exception, not just an
  // {ok:false} result — e.g. a network failure, or the Server Action
  // failing to serialize its response) previously left isPending stuck
  // true forever, since nothing in the upload loop ever caught it. A
  // try/catch/finally around a plain state flag guarantees the spinner
  // always clears and the real error is always shown, regardless of how
  // the upload failed.
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Keep the main preview pointed at a valid image whenever the list changes
  // (an upload, a removal, a reorder).
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(images.length - 1, 0)));
  }, [images.length]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setIsUploading(true);
    try {
      const uploaded: UploadedImage[] = [];
      const failures: string[] = [];
      for (const file of Array.from(files)) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          const result = await uploadMedia(formData);
          if (!result.ok) {
            failures.push(`${file.name}: ${result.error}`);
            continue;
          }
          uploaded.push({ mediaId: result.data.id, url: result.data.url });
        } catch (err) {
          // uploadMedia() threw instead of returning {ok:false} — a
          // network failure or unexpected server error. Never let this
          // fall through silently; record it and keep trying the rest of
          // the selected files.
          failures.push(`${file.name}: ${err instanceof Error ? err.message : "Upload failed unexpectedly"}`);
        }
      }
      if (uploaded.length > 0) {
        const next = multiple ? [...images, ...uploaded] : uploaded.slice(0, 1);
        onChange(next);
        setActiveIndex(multiple ? images.length : 0); // jump the preview to the first newly-added image
      }
      if (failures.length > 0) {
        setError(failures.join(" — "));
      }
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function addFromLibrary(picked: UploadedImage[]) {
    const existingIds = new Set(images.map((img) => img.mediaId));
    const newOnes = picked.filter((img) => !existingIds.has(img.mediaId)); // never duplicate an already-attached image
    if (newOnes.length === 0) return;
    const next = multiple ? [...images, ...newOnes] : newOnes.slice(0, 1);
    onChange(next);
    setActiveIndex(multiple ? images.length : 0);
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function setAsCover(index: number) {
    if (index === 0) return;
    const reordered = [images[index]!, ...images.slice(0, index), ...images.slice(index + 1)];
    onChange(reordered);
    setActiveIndex(0);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const reordered = [...images];
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
    onChange(reordered);
    setActiveIndex(target);
  }

  const active = images[activeIndex];

  return (
    <div>
      {/* Large main preview */}
      <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-lg border bg-muted sm:aspect-[4/5]">
        {active ? (
          <>
            <Image src={active.url} alt="" fill sizes="384px" className="object-cover" />
            {activeIndex === 0 && (
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                <Star className="h-3 w-3 fill-current" /> Cover
              </span>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No images yet</div>
        )}
      </div>

      {/* Thumbnail strip */}
      <div className="mt-3 flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div
            key={img.mediaId}
            className={cn(
              "group relative h-20 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
              i === activeIndex ? "border-accent" : "border-transparent hover:border-input",
            )}
          >
            <button
              type="button"
              onClick={() => setActiveIndex(i)}
              className="absolute inset-0"
              aria-label={`View image ${i + 1}`}
            >
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>

            {i === 0 && (
              <span className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-[9px] font-medium text-white">
                Cover
              </span>
            )}

            {/* Hover controls */}
            <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="pointer-events-auto flex gap-0.5">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    className="rounded bg-black/60 p-0.5 text-white hover:bg-black/80"
                    aria-label="Move earlier"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                )}
                {i < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    className="rounded bg-black/60 p-0.5 text-white hover:bg-black/80"
                    aria-label="Move later"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="pointer-events-auto rounded-full bg-black/60 p-0.5 text-white hover:bg-destructive"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {i !== 0 && (
              <button
                type="button"
                onClick={() => setAsCover(i)}
                className="pointer-events-auto absolute bottom-0 left-0 right-0 hidden items-center justify-center gap-0.5 bg-accent/90 py-0.5 text-[9px] font-medium text-accent-foreground group-hover:flex"
              >
                <Star className="h-2.5 w-2.5" /> Set cover
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          <span className="text-[10px]">Upload</span>
        </button>

        {showMediaPicker && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={isUploading}
            className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:border-accent hover:text-accent disabled:opacity-50"
          >
            <FolderOpen className="h-5 w-5" />
            <span className="text-center text-[10px] leading-tight">Choose from Media</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        Click a thumbnail to preview it. Hover a thumbnail to reorder, set it as the cover image, or remove it.
      </p>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        alreadyAttachedIds={new Set(images.map((img) => img.mediaId))}
        onConfirm={addFromLibrary}
      />
    </div>
  );
}
