import { decodeHtmlEntities } from "@/lib/utils";

export interface NavCategory {
  name: string;
  slug: string;
}

/**
 * Presentation-layer filtering shared by the header nav, mobile drawer, and
 * footer "Shop" column — never touches the underlying `categories` rows.
 * Drops the WooCommerce-import "Uncategorized" catch-all and collapses
 * same-named categories (e.g. two different "Novels" rows) down to the
 * first one encountered, so every nav surface agrees on one clean list.
 */
export function selectNavCategories<T extends NavCategory>(categories: T[], limit: number): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const category of categories) {
    const key = category.name.trim().toLowerCase();
    if (key === "uncategorized" || category.slug === "uncategorized") continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...category, name: decodeHtmlEntities(category.name) });
    if (result.length >= limit) break;
  }

  return result;
}
