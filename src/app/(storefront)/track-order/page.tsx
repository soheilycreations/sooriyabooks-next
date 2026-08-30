import type { Metadata } from "next";
import { TrackOrderStart } from "./track-order-start";

export const metadata: Metadata = { title: "Track Your Order" };

export default function TrackOrderPage() {
  return (
    <div className="container max-w-md py-16 md:py-24">
      <h1 className="font-heading text-3xl leading-tight md:text-4xl">Track Your Order</h1>
      <p className="mt-2 text-muted-foreground">
        Enter your order number to check its status — no account needed.
      </p>
      <TrackOrderStart />
    </div>
  );
}
