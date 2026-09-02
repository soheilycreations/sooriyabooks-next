"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploader, type UploadedImage } from "@/components/admin/image-uploader";
import { createBook, updateBook, setBookImages } from "@/lib/catalog/actions";
import type { BookInput } from "@/lib/validation/book";

interface Option {
  id: string;
  name: string;
}

export function BookForm({
  bookId,
  initial,
  initialImages = [],
  authors,
  publishers,
  categories,
}: {
  bookId?: string;
  initial?: Partial<BookInput>;
  initialImages?: UploadedImage[];
  authors: Option[];
  publishers: Option[];
  categories: Option[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<UploadedImage[]>(initialImages);
  const [form, setForm] = useState<BookInput>({
    title: initial?.title ?? "",
    subtitle: initial?.subtitle ?? "",
    slug: initial?.slug ?? "",
    isbn: initial?.isbn ?? "",
    sku: initial?.sku ?? "",
    authorId: initial?.authorId ?? null,
    publisherId: initial?.publisherId ?? null,
    language: initial?.language ?? "English",
    edition: initial?.edition ?? "",
    pageCount: initial?.pageCount ?? null,
    weightGrams: initial?.weightGrams ?? 0,
    description: initial?.description ?? "",
    shortDescription: initial?.shortDescription ?? "",
    sellingPrice: initial?.sellingPrice ?? 0,
    discountPrice: initial?.discountPrice ?? null,
    categoryIds: initial?.categoryIds ?? [],
    isFeatured: initial?.isFeatured ?? false,
    isNewArrival: initial?.isNewArrival ?? false,
    isBestSeller: initial?.isBestSeller ?? false,
    isActive: initial?.isActive ?? true,
    seoTitle: initial?.seoTitle ?? "",
    seoDescription: initial?.seoDescription ?? "",
    stockQuantity: initial?.stockQuantity ?? 0,
    lowStockThreshold: initial?.lowStockThreshold ?? 5,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      let id = bookId;
      if (bookId) {
        const result = await updateBook(bookId, form);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createBook(form);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        id = result.data.id;
      }
      await setBookImages(id!, images.map((img) => img.mediaId));
      router.push("/admin/products");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input id="subtitle" value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" required value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="isbn">ISBN</Label>
            <Input id="isbn" value={form.isbn} onChange={(e) => setForm((f) => ({ ...f, isbn: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="language">Language</Label>
            <Input id="language" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="authorId">Author</Label>
            <select
              id="authorId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.authorId ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, authorId: e.target.value || null }))}
            >
              <option value="">— Select author —</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="publisherId">Publisher</Label>
            <select
              id="publisherId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.publisherId ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, publisherId: e.target.value || null }))}
            >
              <option value="">— Select publisher —</option>
              {publishers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="edition">Edition</Label>
            <Input id="edition" value={form.edition} onChange={(e) => setForm((f) => ({ ...f, edition: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="pageCount">Pages</Label>
            <Input
              id="pageCount"
              type="number"
              value={form.pageCount ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, pageCount: e.target.value ? Number(e.target.value) : null }))}
            />
          </div>
          <div>
            <Label htmlFor="weightGrams">Weight (grams)</Label>
            <Input
              id="weightGrams"
              type="number"
              required
              value={form.weightGrams}
              onChange={(e) => setForm((f) => ({ ...f, weightGrams: Number(e.target.value) }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">Drives the shipping-cost calculation at checkout.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.map((cat) => (
              <label key={cat.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.categoryIds.includes(cat.id)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      categoryIds: e.target.checked ? [...f.categoryIds, cat.id] : f.categoryIds.filter((id) => id !== cat.id),
                    }))
                  }
                />
                {cat.name}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploader images={images} onChange={setImages} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing &amp; Stock</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sellingPrice">Selling price (LKR)</Label>
            <Input
              id="sellingPrice"
              type="number"
              step="0.01"
              required
              value={form.sellingPrice}
              onChange={(e) => setForm((f) => ({ ...f, sellingPrice: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label htmlFor="discountPrice">Discount price (optional)</Label>
            <Input
              id="discountPrice"
              type="number"
              step="0.01"
              value={form.discountPrice ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, discountPrice: e.target.value ? Number(e.target.value) : null }))}
            />
          </div>
          <div>
            <Label htmlFor="stockQuantity">Stock quantity</Label>
            <Input
              id="stockQuantity"
              type="number"
              value={form.stockQuantity}
              onChange={(e) => setForm((f) => ({ ...f, stockQuantity: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label htmlFor="lowStockThreshold">Low stock alert threshold</Label>
            <Input
              id="lowStockThreshold"
              type="number"
              value={form.lowStockThreshold}
              onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: Number(e.target.value) }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="shortDescription">Short description</Label>
            <textarea
              id="shortDescription"
              className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.shortDescription}
              onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="description">Full description</Label>
            <textarea
              id="description"
              className="flex min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flags &amp; SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            {([
              ["isActive", "Published"],
              ["isFeatured", "Featured"],
              // Deliberately not "New Arrivals" — there's also a real
              // category with that exact name in the list above, and the
              // two are unrelated (this flag drives the homepage "New
              // Arrivals" section and /search?new=1; the category is just
              // an ordinary category). The differing label is the whole
              // fix — staff kept ticking the category by mistake.
              ["isNewArrival", "New Arrival (site highlight)"],
              ["isBestSeller", "Best Seller"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
          <div>
            <Label htmlFor="seoTitle">SEO title</Label>
            <Input id="seoTitle" value={form.seoTitle} onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))} />
          </div>
          <div>
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
      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Saving..." : bookId ? "Save Changes" : "Create Product"}
      </Button>
    </form>
  );
}
