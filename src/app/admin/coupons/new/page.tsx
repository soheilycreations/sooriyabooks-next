import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CouponForm } from "@/components/admin/coupon-form";

export default async function NewCouponPage() {
  await requireStaff();
  const supabase = await createClient();
  const [{ data: books }, { data: categories }] = await Promise.all([
    supabase.from("books").select("id, title").order("title").limit(500),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  return (
    <div>
      <AdminPageHeader title="New Coupon" />
      <CouponForm books={books ?? []} categories={categories ?? []} />
    </div>
  );
}
