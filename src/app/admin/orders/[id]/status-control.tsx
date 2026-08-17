"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateOrderStatus } from "@/lib/orders/admin-actions";
import type { Database } from "@/types/database";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const STATUSES: OrderStatus[] = [
  "pending_payment", "processing", "confirmed", "packed", "shipped", "delivered", "cancelled", "refunded", "failed",
];

export function OrderStatusControl({ orderId, currentStatus }: { orderId: string; currentStatus: OrderStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="text-xs text-muted-foreground">Status</label>
        <select
          className="flex h-10 rounded-md border border-input bg-background px-3 text-sm capitalize"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>
      <input
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="h-10 w-48 rounded-md border border-input bg-background px-3 text-sm"
      />
      <Button
        disabled={isPending || status === currentStatus}
        onClick={() =>
          startTransition(async () => {
            await updateOrderStatus(orderId, status, note);
            router.refresh();
          })
        }
      >
        {isPending ? "Updating..." : "Update Status"}
      </Button>
    </div>
  );
}
