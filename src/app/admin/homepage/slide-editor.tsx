"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUploader, type UploadedImage } from "@/components/admin/image-uploader";
import {
  createBannerSlide,
  updateBannerSlide,
  deleteBannerSlide,
  reorderBannerSlide,
  type BannerSlideInput,
} from "@/lib/content/actions";

export interface SlideData {
  id: string;
  heading: string;
  subheading: string | null;
  buttonText: string | null;
  linkUrl: string | null;
  imageUrl: string | null;
  imageMediaId: string | null;
  isVisible: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

function SlideCard({ slide, isFirst, isLast }: { slide: SlideData; isFirst: boolean; isLast: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [image, setImage] = useState<UploadedImage[]>(
    slide.imageUrl ? [{ mediaId: slide.imageMediaId ?? "", url: slide.imageUrl }] : [],
  );
  const [form, setForm] = useState({
    heading: slide.heading,
    subheading: slide.subheading ?? "",
    buttonText: slide.buttonText ?? "",
    linkUrl: slide.linkUrl ?? "",
    isVisible: slide.isVisible,
    startsAt: slide.startsAt ?? "",
    endsAt: slide.endsAt ?? "",
  });

  function save() {
    startTransition(async () => {
      await updateBannerSlide(slide.id, { ...form, imageMediaId: image[0]?.mediaId ?? null } as BannerSlideInput);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6 sm:grid-cols-[160px_1fr]">
        <div>
          <Label>Image</Label>
          <ImageUploader images={image} onChange={setImage} multiple={false} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Title</Label>
            <Input value={form.heading} onChange={(e) => setForm((f) => ({ ...f, heading: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Subtitle</Label>
            <Input value={form.subheading} onChange={(e) => setForm((f) => ({ ...f, subheading: e.target.value }))} />
          </div>
          <div>
            <Label>Button text</Label>
            <Input value={form.buttonText} onChange={(e) => setForm((f) => ({ ...f, buttonText: e.target.value }))} />
          </div>
          <div>
            <Label>Button link</Label>
            <Input value={form.linkUrl} onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))} placeholder="/category/fiction" />
          </div>
          <div>
            <Label>Visible from (optional)</Label>
            <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
          </div>
          <div>
            <Label>Visible until (optional)</Label>
            <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isVisible} onChange={(e) => setForm((f) => ({ ...f, isVisible: e.target.checked }))} />
              Enabled
            </label>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={isFirst || isPending}
                onClick={() => startTransition(async () => { await reorderBannerSlide(slide.id, "up"); router.refresh(); })}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={isLast || isPending}
                onClick={() => startTransition(async () => { await reorderBannerSlide(slide.id, "down"); router.refresh(); })}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={save} disabled={isPending}>
                Save
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                disabled={isPending}
                onClick={() => {
                  if (!window.confirm("Delete this slide?")) return;
                  startTransition(async () => { await deleteBannerSlide(slide.id); router.refresh(); });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SlideEditor({ slides }: { slides: SlideData[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {slides.map((slide, i) => (
        <SlideCard key={slide.id} slide={slide} isFirst={i === 0} isLast={i === slides.length - 1} />
      ))}
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await createBannerSlide({ heading: "New Slide", imageMediaId: null, isVisible: false });
            router.refresh();
          })
        }
      >
        + Add Slide
      </Button>
    </div>
  );
}
