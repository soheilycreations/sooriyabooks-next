"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { ImageUploader, type UploadedImage } from "@/components/admin/image-uploader";
import { deleteMedia } from "@/lib/media/actions";

export interface MediaItem {
  id: string;
  url: string;
  altText: string | null;
}

export function MediaLibraryClient({ initialMedia }: { initialMedia: MediaItem[] }) {
  const [media, setMedia] = useState(initialMedia);
  const [isPending, startTransition] = useTransition();

  function handleUpload(images: UploadedImage[]) {
    setMedia((prev) => [...images.map((img) => ({ id: img.mediaId, url: img.url, altText: null })), ...prev]);
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this image? It will be removed from storage permanently.")) return;
    startTransition(async () => {
      const result = await deleteMedia(id);
      if (result.ok) setMedia((prev) => prev.filter((m) => m.id !== id));
      else window.alert(result.error);
    });
  }

  return (
    <div>
      <div className="mb-6">
        <ImageUploader images={[]} onChange={handleUpload} multiple showMediaPicker={false} />
      </div>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
        {media.map((m) => (
          <div key={m.id} className="group relative aspect-square overflow-hidden rounded-md border">
            <Image src={m.url} alt={m.altText ?? ""} fill sizes="150px" className="object-cover" />
            <button
              onClick={() => handleDelete(m.id)}
              disabled={isPending}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      {media.length === 0 && <p className="text-sm text-muted-foreground">No media uploaded yet.</p>}
    </div>
  );
}
