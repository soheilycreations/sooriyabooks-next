import { createServiceRoleClient } from "@/lib/supabase/server";
import type { DateRange } from "./queries";

export interface TrafficReport {
  totalPageViews: number;
  uniqueVisitors: number;
  dailySeries: { date: string; views: number; visitors: number }[];
  topPages: { path: string; views: number }[];
}

/**
 * Reads the page_views table middleware.ts writes to. Uses the
 * service-role client (bypasses RLS, which denies everyone else by
 * design — see 0026_page_views.sql) rather than the request-scoped
 * client, since this only ever runs from the admin dashboard, already
 * gated by requireStaff() at the page level.
 */
export async function getTrafficReport(range: DateRange): Promise<TrafficReport> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("page_views")
    .select("path, visitor_id, created_at")
    .gte("created_at", range.from.toISOString())
    .lte("created_at", range.to.toISOString());

  const rows = data ?? [];
  const totalPageViews = rows.length;
  const uniqueVisitors = new Set(rows.map((r) => r.visitor_id)).size;

  const byDay = new Map<string, { views: number; visitors: Set<string> }>();
  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    const entry = byDay.get(day) ?? { views: 0, visitors: new Set<string>() };
    entry.views += 1;
    entry.visitors.add(row.visitor_id);
    byDay.set(day, entry);
  }
  const dailySeries = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, views: v.views, visitors: v.visitors.size }));

  const byPath = new Map<string, number>();
  for (const row of rows) byPath.set(row.path, (byPath.get(row.path) ?? 0) + 1);
  const topPages = Array.from(byPath.entries())
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  return { totalPageViews, uniqueVisitors, dailySeries, topPages };
}
