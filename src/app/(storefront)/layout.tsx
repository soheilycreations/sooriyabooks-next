import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { CartProvider } from "@/lib/cart/cart-context";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Header />
      <main>{children}</main>
      <Footer />
    </CartProvider>
  );
}
