"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { uploadMedia } from "@/lib/media/actions";

export interface UploadedImage {
  mediaId: string;
  url: string;
}

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
      onChange(multiple ? [...images, ...uploaded] : uploaded.slice(0, 1));
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((img, i) => (
          <div key={img.mediaId} className="group relative h-24 w-24 overflow-hidden rounded-md border">
            <Image src={img.url} alt="" fill sizes="96px" className="object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
            {i === 0 && (
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-[10px] text-white">
                Primary
              </span>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:border-accent hover:text-accent"
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
    </div>
  );
}
