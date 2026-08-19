import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cityId?: string }>;
}) {
  // createOrder() already rejects unauthenticated submissions server-side —
  // this just surfaces that requirement before the customer fills out the
  // whole form, instead of only at submit time. Preserve ?cityId= through
  // the redirect so the shipping selection made on the cart page survives
  // the login detour.
  const user = await getCurrentUser();
  if (!user) {
    const { cityId } = await searchParams;
    const redirectTo = cityId ? `/checkout?cityId=${cityId}` : "/checkout";
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  return (
    <div className="container py-12 md:py-16">
      <h1 className="mb-8 font-heading text-3xl leading-tight md:text-4xl md:leading-tight">Checkout</h1>
      <Suspense fallback={null}>
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
