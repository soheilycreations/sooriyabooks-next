"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { moderateReview, replyToReview } from "@/lib/customers/review-actions";
import { formatDate } from "@/lib/utils";

export interface AdminReview {
  id: string;
  bookTitle: string;
  customerName: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  createdAt: string;
  staffReply: string | null;
}

export function ReviewRow({ review }: { review: AdminReview }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [replyText, setReplyText] = useState(review.staffReply ?? "");
  const [showReply, setShowReply] = useState(false);

  return (
    <div className="border-b py-4 last:border-0">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{review.bookTitle}</p>
          <p className="text-sm text-muted-foreground">
            {review.customerName} &middot; {review.rating}/5 &middot; {formatDate(review.createdAt)}
          </p>
          {review.title && <p className="mt-1 font-medium">{review.title}</p>}
          {review.body && <p className="mt-1 text-sm text-muted-foreground">{review.body}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={review.status === "approved" ? "success" : review.status === "rejected" ? "destructive" : "secondary"}>
            {review.status}
          </Badge>
          {review.status === "pending" && (
            <>
              <Button
                variant="outline"
                size="icon"
                disabled={isPending}
                onClick={() => startTransition(async () => { await moderateReview(review.id, "approved"); router.refresh(); })}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={isPending}
                onClick={() => startTransition(async () => { await moderateReview(review.id, "rejected"); router.refresh(); })}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {showReply ? (
        <div className="mt-3 flex gap-2">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          />
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => startTransition(async () => { await replyToReview(review.id, replyText); setShowReply(false); router.refresh(); })}
          >
            Save
          </Button>
        </div>
      ) : (
        <button onClick={() => setShowReply(true)} className="mt-2 text-xs text-accent hover:underline">
          {review.staffReply ? "Edit reply" : "Reply"}
        </button>
      )}
    </div>
  );
}
