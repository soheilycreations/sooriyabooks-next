import { AlertCircle } from "lucide-react";
import { RetryPaymentButton } from "@/app/(storefront)/checkout/return/retry-payment-button";

/**
 * True when an order's card payment didn't go through: either it failed outright
 * ("failed": declined, 3-D Secure failed), or it was auto-expired after sitting
 * unpaid for 60 minutes (status "cancelled" with payment_status "failed", set by
 * expire_unpaid_card_orders(), migration 0031). A "cancelled" order whose
 * payment_status isn't "failed" was cancelled by staff and is not a payment
 * problem. Shared so the guest and signed-in pages can never disagree.
 */
export function isPaymentNotCompleted(order: { status: string; paymentStatus: string }): boolean {
  return order.status === "failed" || (order.status === "cancelled" && order.paymentStatus === "failed");
}

/**
 * Shown on an order page when the card payment didn't go through (declined,
 * 3-D Secure failed, abandoned). One component so the guest tracking page and
 * the signed-in order page can't drift apart in wording. Pass `retryOrderId`
 * to include the "Try Payment Again" button; omit it when the order isn't
 * known yet (a guest hasn't verified their phone number).
 */
export function PaymentNotCompleted({
  orderNumber,
  retryOrderId,
  children,
}: {
  orderNumber: string;
  retryOrderId?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <div>
        <p className="font-heading text-2xl">Payment Not Completed</p>
        <p className="mt-1 max-w-sm text-muted-foreground">
          Order <span className="font-medium text-foreground">{orderNumber}</span> was saved, but the payment did not
          go through. You were not charged.
        </p>
      </div>
      {children}
      {retryOrderId && (
        <div className="w-full max-w-xs">
          <RetryPaymentButton orderId={retryOrderId} />
        </div>
      )}
    </div>
  );
}
