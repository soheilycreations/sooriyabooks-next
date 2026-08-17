"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createCategory, updateCategory } from "@/lib/catalog/actions";
import type { CategoryInput } from "@/lib/validation/taxonomy";

export function CategoryForm({
  categoryId,
  initial,
  parentOptions,
}: {
  categoryId?: string;
  initial?: Partial<CategoryInput>;
  parentOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryInput>({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    parentId: initial?.parentId ?? null,
    description: initial?.description ?? "",
    imageUrl: initial?.imageUrl ?? "",
    sortOrder: initial?.sortOrder ?? 0,
    seoTitle: initial?.seoTitle ?? "",
    seoDescription: initial?.seoDescription ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = categoryId ? await updateCategory(categoryId, form) : await createCategory(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/categories");
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
          <div>
            <Label htmlFor="parentId">Parent category</Label>
            <select
              id="parentId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.parentId ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value || null }))}
            >
              <option value="">None (top level)</option>
              {parentOptions
                .filter((p) => p.id !== categoryId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <Label htmlFor="sortOrder">Sort order</Label>
            <Input
              id="sortOrder"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
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
        {isPending ? "Saving..." : categoryId ? "Save Changes" : "Create Category"}
      </Button>
    </form>
  );
}
