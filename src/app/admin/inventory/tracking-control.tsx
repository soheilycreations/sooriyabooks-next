"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setStockTracking } from "@/lib/inventory/actions";

export function TrackingControl({
  bookId,
  trackingEnabled,
  untrackedAvailable,
}: {
  bookId: string;
  trackingEnabled: boolean;
  untrackedAvailable: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showEnableForm, setShowEnableForm] = useState(false);
  const [startingQuantity, setStartingQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
        return;
      }
      setShowEnableForm(false);
      router.refresh();
    });
  }

  if (trackingEnabled) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground"
        disabled={isPending}
        onClick={() => run(() => setStockTracking(bookId, { trackingEnabled: false, untrackedAvailable: true }))}
      >
        Disable tracking
      </Button>
    );
  }

  if (showEnableForm) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          placeholder="Real qty"
          value={startingQuantity}
          onChange={(e) => setStartingQuantity(e.target.value)}
          className="h-8 w-24 text-xs"
        />
        <Button
          size="sm"
          disabled={isPending || !startingQuantity}
          onClick={() =>
            run(() => setStockTracking(bookId, { trackingEnabled: true, quantityOnHand: Number(startingQuantity) }))
          }
        >
          Confirm
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowEnableForm(false)}>
          Cancel
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        disabled={isPending}
        onClick={() => run(() => setStockTracking(bookId, { trackingEnabled: false, untrackedAvailable: !untrackedAvailable }))}
      >
        Mark {untrackedAvailable ? "Out of Stock" : "In Stock"}
      </Button>
      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowEnableForm(true)}>
        Enable tracking
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
