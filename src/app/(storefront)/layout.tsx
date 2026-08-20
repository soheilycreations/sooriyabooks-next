import { Suspense } from "react";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { GoogleOneTap } from "@/components/shared/google-one-tap";
import { CartProvider } from "@/lib/cart/cart-context";
import { getCurrentUser } from "@/lib/auth/session";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <CartProvider>
      <Header />
      <main>{children}</main>
      <Footer />
      {/* Auto One Tap prompt across public storefront pages — never shown to an already-signed-in customer. */}
      <Suspense fallback={null}>
        <GoogleOneTap enabled={!user} />
      </Suspense>
    </CartProvider>
  );
}
