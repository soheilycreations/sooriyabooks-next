import { HeaderClient } from "@/components/shared/header-client";
import { selectNavCategories } from "@/lib/catalog/nav-categories";
import { createClient } from "@/lib/supabase/server";

async function getTopNavCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("sort_order")
    .limit(400); // whole catalog is a couple hundred rows — top-level + their direct children

  const rows = data ?? [];
  // "Other" is a catch-all top-level category (just one book, "Lankan
  // Medicine") — not worth its own nav slot, so it's dropped here rather
  // than shown alongside the real top-level categories.
  const topLevel = rows.filter((c) => c.parent_id === null && c.slug !== "other");
  // Only one hierarchy depth exists in this catalog (e.g. "Sooriya Books" ->
  // "Translations") — a child's own parent_id always points at a top-level
  // row, never another child.
  const childrenByParentId = new Map<string, typeof rows>();
  for (const c of rows) {
    if (c.parent_id === null) continue;
    if (!childrenByParentId.has(c.parent_id)) childrenByParentId.set(c.parent_id, []);
    childrenByParentId.get(c.parent_id)!.push(c);
  }

  // "Sooriya Books" is the publisher's own imprint and the category with by
  // far the most sub-categories — surfaced first rather than left to fall
  // wherever sort_order happens to place it.
  const sortedTopLevel = [...topLevel].sort((a, b) => {
    if (a.slug === "sooriya-books") return -1;
    if (b.slug === "sooriya-books") return 1;
    return 0;
  });

  const withChildren = sortedTopLevel.map((c) => ({
    name: c.name,
    slug: c.slug,
    children: selectNavCategories(childrenByParentId.get(c.id) ?? [], 20),
  }));

  // The mega menu can comfortably hold more than the old 6-link top bar —
  // capped at 24 so the panel stays a clean, scannable set of columns
  // rather than every WooCommerce-import category ever created.
  return selectNavCategories(withChildren, 24);
}

export async function Header() {
  const categories = await getTopNavCategories();
  return <HeaderClient categories={categories} />;
}
