import { HeaderClient } from "@/components/shared/header-client";
import { selectNavCategories } from "@/lib/catalog/nav-categories";
import { createClient } from "@/lib/supabase/server";

async function getTopNavCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("name, slug")
    .is("parent_id", null)
    .order("sort_order")
    .limit(80); // covers every top-level row (63 today) — selectNavCategories dedupes/filters it down

  // The mega menu can comfortably hold more than the old 6-link top bar —
  // capped at 24 so the panel stays a clean, scannable set of columns
  // rather than every WooCommerce-import category ever created.
  return selectNavCategories(data ?? [], 24);
}

export async function Header() {
  const categories = await getTopNavCategories();
  return <HeaderClient categories={categories} />;
}
