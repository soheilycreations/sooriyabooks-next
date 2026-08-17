"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adjustStock } from "@/lib/inventory/actions";

export function StockAdjustControl({ bookId }: { bookId: string }) {
  const router = useRouter();
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        placeholder="+/-"
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        className="h-8 w-20 text-xs"
      />
      <Input
        placeholder="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="h-8 w-32 text-xs"
      />
      <Button
        size="sm"
        disabled={isPending || !delta}
        onClick={() =>
          startTransition(async () => {
            const result = await adjustStock(bookId, Number(delta), reason);
            if (!result.ok) window.alert(result.error);
            setDelta("");
            setReason("");
            router.refresh();
          })
        }
      >
        Apply
      </Button>
    </div>
  );
}
