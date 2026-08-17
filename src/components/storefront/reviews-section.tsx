"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { submitReview } from "@/lib/customers/review-actions";
import { formatDate, cn } from "@/lib/utils";
import type { ReviewData } from "@/lib/customers/review-queries";

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={cn(!onChange && "cursor-default")}
        >
          <Star className={cn("h-4 w-4", n <= value ? "fill-accent text-accent" : "text-muted-foreground")} />
        </button>
      ))}
    </div>
  );
}

export function ReviewsSection({ bookId, reviews }: { bookId: string; reviews: ReviewData[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const bookSlugMatch = window.location.pathname.split("/").pop() || "";
      const result = await submitReview(bookId, bookSlugMatch, rating, title, body);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("Thanks! Your review will appear once it's approved.");
      setShowForm(false);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl">Reviews</h2>
          {reviews.length > 0 && (
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <StarRating value={Math.round(avgRating)} />
              <span>{avgRating.toFixed(1)} ({reviews.length} reviews)</span>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm((s) => !s)}>
          Write a Review
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-lg border p-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Rating</label>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <textarea
            placeholder="Share your thoughts..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? "Submitting..." : "Submit Review"}
          </Button>
        </form>
      )}
      {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}

      <div className="mt-6 space-y-6">
        {reviews.length === 0 && !showForm && <p className="text-sm text-muted-foreground">No reviews yet — be the first.</p>}
        {reviews.map((r) => (
          <div key={r.id} className="border-b pb-6 last:border-0">
            <div className="flex items-center gap-2">
              <StarRating value={r.rating} />
              {r.isVerifiedPurchase && <Badge variant="success">Verified Purchase</Badge>}
            </div>
            {r.title && <p className="mt-2 font-medium">{r.title}</p>}
            {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
            <p className="mt-2 text-xs text-muted-foreground">{r.customerName} &middot; {formatDate(r.createdAt)}</p>
            {r.staffReply && (
              <div className="mt-3 rounded-md bg-secondary/50 p-3 text-sm">
                <p className="font-medium">Response from Sooriya Publishers</p>
                <p className="mt-1 text-muted-foreground">{r.staffReply}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
