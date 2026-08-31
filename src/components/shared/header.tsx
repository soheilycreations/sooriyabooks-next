import { HeaderClient } from "@/components/shared/header-client";
import { getSooriyaBooksCategories } from "@/lib/catalog/queries";

export async function Header() {
  const categories = await getSooriyaBooksCategories();
  return <HeaderClient categories={categories} />;
}
