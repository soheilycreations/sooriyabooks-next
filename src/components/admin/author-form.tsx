"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUploader, type UploadedImage } from "@/components/admin/image-uploader";
import { createAuthor, updateAuthor } from "@/lib/catalog/actions";
import type { AuthorInput } from "@/lib/validation/taxonomy";

export function AuthorForm({ authorId, initial }: { authorId?: string; initial?: Partial<AuthorInput> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<UploadedImage[]>(
    initial?.photoUrl ? [{ mediaId: "existing", url: initial.photoUrl }] : [],
  );
  const [form, setForm] = useState<AuthorInput>({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    bio: initial?.bio ?? "",
    photoUrl: initial?.photoUrl ?? "",
    isFeatured: initial?.isFeatured ?? false,
    seoTitle: initial?.seoTitle ?? "",
    seoDescription: initial?.seoDescription ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { ...form, photoUrl: photo[0]?.url ?? "" };
    startTransition(async () => {
      const result = authorId ? await updateAuthor(authorId, payload) : await createAuthor(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/authors");
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
            <Label>Photo</Label>
            <ImageUploader images={photo} onChange={setPhoto} multiple={false} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
            />
            <span className="text-sm">Featured author (shown in homepage Featured Authors section)</span>
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
        {isPending ? "Saving..." : authorId ? "Save Changes" : "Create Author"}
      </Button>
    </form>
  );
}
