import type { Metadata } from "next";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Your Cart" };

export default function CartPage() {
  return (
    <div className="container py-12">
      <h1 className="mb-8 font-heading text-3xl">Your Cart</h1>
      <CartView />
    </div>
  );
}
