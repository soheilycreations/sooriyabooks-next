import { Suspense } from "react";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { BackToTop } from "@/components/shared/back-to-top";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { GoogleOneTap } from "@/components/shared/google-one-tap";
import { CartProvider } from "@/lib/cart/cart-context";
import { getCurrentUser } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/settings/actions";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSiteSettings()]);

  return (
    <CartProvider>
      <Header />
      <main>{children}</main>
      <Footer />
      <BackToTop floating />
      <WhatsAppButton url={settings.whatsappUrl} />
      {/* Auto One Tap prompt across public storefront pages — never shown to an already-signed-in customer. */}
      <Suspense fallback={null}>
        <GoogleOneTap enabled={!user} />
      </Suspense>
    </CartProvider>
  );
}
