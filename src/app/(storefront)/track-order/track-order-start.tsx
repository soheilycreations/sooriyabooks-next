"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TrackOrderStart() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = orderNumber.trim();
    if (!trimmed) return;
    router.push(`/track-order/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <Label htmlFor="orderNumber">Order number</Label>
        <Input
          id="orderNumber"
          placeholder="SB-2026-000123"
          required
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
        />
      </div>
      <Button type="submit" variant="accent" className="w-full">
        Continue
      </Button>
    </form>
  );
}
