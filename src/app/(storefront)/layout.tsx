import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
