import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  // No login wall — createOrder() supports guest checkout (see
  // place_guest_order() in supabase/migrations/0019_guest_checkout.sql).
  return (
    <div className="container py-12 md:py-16">
      <h1 className="mb-8 font-heading text-3xl leading-tight md:text-4xl md:leading-tight">Checkout</h1>
      <Suspense fallback={null}>
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
