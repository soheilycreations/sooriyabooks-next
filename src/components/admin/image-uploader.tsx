"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Upload, X, Loader2, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadMedia } from "@/lib/media/actions";

export interface UploadedImage {
  mediaId: string;
  url: string;
}

/**
 * Multi-image gallery manager. Upload/remove logic is unchanged from the
 * original implementation — only the presentation changed: a large main
 * preview + a thumbnail strip, instead of a flat grid of same-size
 * thumbnails that made it hard to tell how many images existed or which
 * one was the cover.
 *
 * The underlying data model is unchanged too: `images[0]` is always the
 * primary/cover image (matches setBookImages() in src/lib/catalog/actions.ts,
 * which sets is_primary = index===0 on save) — "Set as cover" here just
 * reorders the array so the chosen image becomes index 0.
 */
export function ImageUploader({
  images,
  onChange,
  multiple = true,
}: {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Keep the main preview pointed at a valid image whenever the list changes
  // (an upload, a removal, a reorder).
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(images.length - 1, 0)));
  }, [images.length]);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    startTransition(async () => {
      const uploaded: UploadedImage[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadMedia(formData);
        if (!result.ok) {
          setError(result.error);
          continue;
        }
        uploaded.push({ mediaId: result.data.id, url: result.data.url });
      }
      const next = multiple ? [...images, ...uploaded] : uploaded.slice(0, 1);
      onChange(next);
      if (uploaded.length > 0) setActiveIndex(multiple ? images.length : 0); // jump the preview to the first newly-added image
      if (inputRef.current) inputRef.current.value = "";
    });
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
          disabled={isPending}
          className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:border-accent hover:text-accent"
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          <span className="text-[10px]">Upload</span>
        </button>
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
    </div>
  );
}
