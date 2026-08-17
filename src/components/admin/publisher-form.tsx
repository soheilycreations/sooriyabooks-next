"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUploader, type UploadedImage } from "@/components/admin/image-uploader";
import { createPublisher, updatePublisher } from "@/lib/catalog/actions";
import type { PublisherInput } from "@/lib/validation/taxonomy";

export function PublisherForm({ publisherId, initial }: { publisherId?: string; initial?: Partial<PublisherInput> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [logo, setLogo] = useState<UploadedImage[]>(
    initial?.logoUrl ? [{ mediaId: "existing", url: initial.logoUrl }] : [],
  );
  const [form, setForm] = useState<PublisherInput>({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    logoUrl: initial?.logoUrl ?? "",
    isFeatured: initial?.isFeatured ?? false,
    seoTitle: initial?.seoTitle ?? "",
    seoDescription: initial?.seoDescription ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { ...form, logoUrl: logo[0]?.url ?? "" };
    startTransition(async () => {
      const result = publisherId ? await updatePublisher(publisherId, payload) : await createPublisher(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/publishers");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Logo</Label>
            <ImageUploader images={logo} onChange={setLogo} multiple={false} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
            />
            <span className="text-sm">Featured publisher (shown in homepage Featured Publishers section)</span>
          </label>
          <div className="sm:col-span-2">
            <Label htmlFor="seoTitle">SEO title</Label>
            <Input id="seoTitle" value={form.seoTitle} onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="seoDescription">SEO description</Label>
            <textarea
              id="seoDescription"
              className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.seoDescription}
              onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : publisherId ? "Save Changes" : "Create Publisher"}
      </Button>
    </form>
  );
}
