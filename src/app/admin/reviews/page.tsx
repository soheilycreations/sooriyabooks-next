import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ReviewRow, type AdminReview } from "./review-row";

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff();
  const { status = "pending" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("reviews")
    .select("id, rating, title, body, status, created_at, staff_reply, books ( title ), profiles ( full_name )")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") query = query.eq("status", status as never);

  const { data } = await query;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviews: AdminReview[] = (data ?? []).map((r: any) => ({
    id: r.id,
    bookTitle: r.books?.title ?? "Unknown book",
    customerName: r.profiles?.full_name || "Anonymous",
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    createdAt: r.created_at,
    staffReply: r.staff_reply,
  }));

  return (
    <div>
      <AdminPageHeader title="Reviews" />
      <div className="mb-4 flex gap-2">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <a
            key={s}
            href={`/admin/reviews?status=${s}`}
            className={`rounded-full px-3 py-1 text-xs capitalize ${status === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
          >
            {s}
          </a>
        ))}
      </div>
      <div className="rounded-lg border p-4">
        {reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews found.</p>}
        {reviews.map((r) => (
          <ReviewRow key={r.id} review={r} />
        ))}
      </div>
    </div>
  );
}
