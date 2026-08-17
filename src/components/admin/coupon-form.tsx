"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createCoupon, updateCoupon } from "@/lib/pricing/actions";
import type { CouponInput } from "@/lib/validation/coupon";

export function CouponForm({
  couponId,
  initial,
  books,
  categories,
}: {
  couponId?: string;
  initial?: Partial<CouponInput>;
  books: { id: string; title: string }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CouponInput>({
    code: initial?.code ?? "",
    type: initial?.type ?? "percentage",
    value: initial?.value ?? 10,
    scope: initial?.scope ?? "all",
    bookIds: initial?.bookIds ?? [],
    categoryIds: initial?.categoryIds ?? [],
    minimumOrderAmount: initial?.minimumOrderAmount ?? 0,
    usageLimit: initial?.usageLimit ?? null,
    perCustomerLimit: initial?.perCustomerLimit ?? null,
    startsAt: initial?.startsAt ?? "",
    expiresAt: initial?.expiresAt ?? "",
    isActive: initial?.isActive ?? true,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = couponId ? await updateCoupon(couponId, form) : await createCoupon(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/coupons");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="code">Coupon code</Label>
            <Input id="code" required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
          </div>
          <div>
            <Label htmlFor="type">Discount type</Label>
            <select
              id="type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CouponInput["type"] }))}
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </div>
          <div>
            <Label htmlFor="value">{form.type === "percentage" ? "Percentage off" : "Amount off (LKR)"}</Label>
            <Input id="value" type="number" step="0.01" required value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))} />
          </div>
          <div>
            <Label htmlFor="minimumOrderAmount">Minimum order amount</Label>
            <Input
              id="minimumOrderAmount"
              type="number"
              step="0.01"
              value={form.minimumOrderAmount}
              onChange={(e) => setForm((f) => ({ ...f, minimumOrderAmount: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label htmlFor="scope">Applies to</Label>
            <select
              id="scope"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.scope}
              onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as CouponInput["scope"] }))}
            >
              <option value="all">All products</option>
              <option value="book">Specific books</option>
              <option value="category">Specific categories</option>
            </select>
          </div>
          {form.scope === "book" && (
            <div className="sm:col-span-2 max-h-40 overflow-y-auto rounded-md border p-3">
              {books.map((b) => (
                <label key={b.id} className="flex items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={form.bookIds.includes(b.id)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bookIds: e.target.checked ? [...f.bookIds, b.id] : f.bookIds.filter((id) => id !== b.id) }))
                    }
                  />
                  {b.title}
                </label>
              ))}
            </div>
          )}
          {form.scope === "category" && (
            <div className="sm:col-span-2 max-h-40 overflow-y-auto rounded-md border p-3">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={form.categoryIds.includes(c.id)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, categoryIds: e.target.checked ? [...f.categoryIds, c.id] : f.categoryIds.filter((id) => id !== c.id) }))
                    }
                  />
                  {c.name}
                </label>
              ))}
            </div>
          )}
          <div>
            <Label htmlFor="usageLimit">Total usage limit</Label>
            <Input
              id="usageLimit"
              type="number"
              value={form.usageLimit ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value ? Number(e.target.value) : null }))}
            />
          </div>
          <div>
            <Label htmlFor="perCustomerLimit">Per-customer limit</Label>
            <Input
              id="perCustomerLimit"
              type="number"
              value={form.perCustomerLimit ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, perCustomerLimit: e.target.value ? Number(e.target.value) : null }))}
            />
          </div>
          <div>
            <Label htmlFor="startsAt">Starts</Label>
            <Input id="startsAt" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="expiresAt">Expires</Label>
            <Input id="expiresAt" type="datetime-local" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            <span className="text-sm">Active</span>
          </label>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : couponId ? "Save Changes" : "Create Coupon"}
      </Button>
    </form>
  );
}
