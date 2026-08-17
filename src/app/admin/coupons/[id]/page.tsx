import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CouponForm } from "@/components/admin/coupon-form";

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: coupon }, { data: books }, { data: categories }, { data: couponBooks }, { data: couponCategories }] = await Promise.all([
    supabase.from("coupons").select("*").eq("id", id).maybeSingle(),
    supabase.from("books").select("id, title").order("title").limit(500),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("coupon_books").select("book_id").eq("coupon_id", id),
    supabase.from("coupon_categories").select("category_id").eq("coupon_id", id),
  ]);

  if (!coupon) notFound();

  return (
    <div>
      <AdminPageHeader title={`Edit: ${coupon.code}`} />
      <CouponForm
        couponId={id}
        books={books ?? []}
        categories={categories ?? []}
        initial={{
          code: coupon.code,
          type: coupon.type,
          value: Number(coupon.value),
          scope: coupon.scope,
          bookIds: (couponBooks ?? []).map((b) => b.book_id),
          categoryIds: (couponCategories ?? []).map((c) => c.category_id),
          minimumOrderAmount: Number(coupon.minimum_order_amount ?? 0),
          usageLimit: coupon.usage_limit,
          perCustomerLimit: coupon.per_customer_limit,
          startsAt: coupon.starts_at ?? "",
          expiresAt: coupon.expires_at ?? "",
          isActive: coupon.is_active,
        }}
      />
    </div>
  );
}
