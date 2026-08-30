import type { Metadata } from "next";
import { TrackOrderResult } from "./track-order-result";

export const metadata: Metadata = { title: "Track Your Order" };

export default async function TrackOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { orderNumber } = await params;
  const { placed } = await searchParams;

  return (
    <div className="container max-w-2xl py-16 md:py-24">
      <TrackOrderResult orderNumber={decodeURIComponent(orderNumber)} justPlaced={placed === "1"} />
    </div>
  );
}
