"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listMedia } from "@/lib/media/actions";
import type { UploadedImage } from "./image-uploader";

/**
 * Lets an admin attach existing media_assets to a product's gallery
 * instead of always uploading a new file. Reuses listMedia() — the same
 * data/query the standalone Media Library page (src/app/admin/media)
 * already uses — rather than a second query implementation.
 */
export function MediaPickerDialog({
  open,
  onOpenChange,
  alreadyAttachedIds,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alreadyAttachedIds: Set<string>;
  onConfirm: (images: UploadedImage[]) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<{ id: string; url: string; altText: string | null }[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setError(null);
    setItems(null);
    startTransition(async () => {
      try {
        const media = await listMedia(120);
        setItems(media.map((m) => ({ id: m.id, url: m.url, altText: m.altText })));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load the media library");
      }
    });
  }, [open]);

  function toggle(id: string) {
    if (alreadyAttachedIds.has(id)) return; // already on this product — nothing to toggle
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    if (!items) return;
    const chosen = items.filter((item) => selected.has(item.id));
    onConfirm(chosen.map((item) => ({ mediaId: item.id, url: item.url })));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Choose from Media Library</DialogTitle>
          <DialogDescription>
            Select one or more existing images to add to this product&apos;s gallery.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto">
          {isPending && !items && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading media library...
            </div>
          )}
          {error && <p className="py-8 text-center text-sm text-destructive">{error}</p>}
          {items && items.length === 0 && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No media uploaded yet — upload an image first from the Media Library.
            </p>
          )}
          {items && items.length > 0 && (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
              {items.map((item) => {
                const alreadyAttached = alreadyAttachedIds.has(item.id);
                const isSelected = selected.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={alreadyAttached}
                    onClick={() => toggle(item.id)}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-md border-2 transition-colors",
                      alreadyAttached && "cursor-not-allowed opacity-40",
                      isSelected ? "border-accent" : "border-transparent hover:border-input",
                    )}
                  >
                    <Image src={item.url} alt={item.altText ?? ""} fill sizes="120px" className="object-cover" />
                    {isSelected && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    {alreadyAttached && (
                      <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[9px] font-medium text-white">
                        Already added
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0}>
            Add {selected.size > 0 ? selected.size : ""} {selected.size === 1 ? "Image" : "Images"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
