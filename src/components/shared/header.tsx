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
    .limit(20); // generous buffer — selectNavCategories dedupes/filters down to the real nav count

  return selectNavCategories(data ?? [], 6);
}

export async function Header() {
  const categories = await getTopNavCategories();
  return <HeaderClient categories={categories} />;
}
