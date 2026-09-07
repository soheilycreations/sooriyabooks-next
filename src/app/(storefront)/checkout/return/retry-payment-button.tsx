"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/shared/form-alert";
import { initiateBankPayment } from "@/lib/payments/actions";

export function RetryPaymentButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function retry() {
    setError(null);
    startTransition(async () => {
      const result = await initiateBankPayment(orderId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.data.redirectUrl;
    });
  }

  return (
    <div className="space-y-3">
      {error && <FormAlert>{error}</FormAlert>}
      <Button variant="accent" size="lg" className="w-full" onClick={retry} disabled={isPending}>
        {isPending ? "Starting payment..." : "Try Payment Again"}
      </Button>
    </div>
  );
}
