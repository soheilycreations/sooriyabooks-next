"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { blockCustomer, unblockCustomer } from "@/lib/customers/actions";

export function BlockCustomerControl({ customerId, isBlocked }: { customerId: string; isBlocked: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  if (isBlocked) {
    return (
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await unblockCustomer(customerId);
            router.refresh();
          })
        }
      >
        {isPending ? "Unblocking..." : "Unblock Customer"}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="w-56" />
      <Button
        variant="destructive"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await blockCustomer(customerId, reason);
            router.refresh();
          })
        }
      >
        {isPending ? "Blocking..." : "Block Customer"}
      </Button>
    </div>
  );
}
