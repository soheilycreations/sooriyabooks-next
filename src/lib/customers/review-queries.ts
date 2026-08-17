import { createClient } from "@/lib/supabase/server";

export interface ReviewData {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  isVerifiedPurchase: boolean;
  staffReply: string | null;
  customerName: string;
}

export async function getBookReviews(bookId: string): Promise<ReviewData[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, title, body, created_at, order_item_id, staff_reply, profiles ( full_name )")
    .eq("book_id", bookId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
    isVerifiedPurchase: r.order_item_id != null,
    staffReply: r.staff_reply,
    customerName: r.profiles?.full_name || "Anonymous",
  }));
}

export async function getCustomerReviewForBook(bookId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, title, body, status")
    .eq("book_id", bookId)
    .eq("customer_id", user.id)
    .maybeSingle();
  return data;
}
