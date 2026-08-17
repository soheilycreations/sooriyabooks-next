import { createClient } from "@/lib/supabase/server";

export interface DateRange {
  from: Date;
  to: Date;
}

export function resolveDateRange(preset: string, customFrom?: string, customTo?: string): DateRange {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "week": {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case "year": {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to: endOfDay(now) };
    }
    case "custom":
      return {
        from: customFrom ? new Date(customFrom) : startOfDay(now),
        to: customTo ? endOfDay(new Date(customTo)) : endOfDay(now),
      };
    case "month":
    default: {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to: endOfDay(now) };
    }
  }
}

export interface SalesReport {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  newCustomers: number;
  dailySeries: { date: string; revenue: number; orders: number }[];
  bestSellers: { title: string; quantitySold: number; revenue: number }[];
}

export async function getSalesReport(range: DateRange): Promise<SalesReport> {
  const supabase = await createClient();
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, grand_total, placed_at, status")
    .gte("placed_at", fromIso)
    .lte("placed_at", toIso)
    .neq("status", "failed")
    .neq("status", "cancelled");

  const { count: newCustomers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", fromIso)
    .lte("created_at", toIso);

  const orderList = orders ?? [];
  const totalRevenue = orderList.reduce((sum, o) => sum + Number(o.grand_total), 0);
  const totalOrders = orderList.length;

  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (const o of orderList) {
    const day = o.placed_at.slice(0, 10);
    const entry = byDay.get(day) ?? { revenue: 0, orders: 0 };
    entry.revenue += Number(o.grand_total);
    entry.orders += 1;
    byDay.set(day, entry);
  }
  const dailySeries = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  let bestSellers: SalesReport["bestSellers"] = [];
  if (orderList.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("title_snapshot, quantity, line_total, order_id")
      .in("order_id", orderList.map((o) => o.id));

    const byTitle = new Map<string, { quantitySold: number; revenue: number }>();
    for (const item of items ?? []) {
      const entry = byTitle.get(item.title_snapshot) ?? { quantitySold: 0, revenue: 0 };
      entry.quantitySold += item.quantity;
      entry.revenue += Number(item.line_total);
      byTitle.set(item.title_snapshot, entry);
    }
    bestSellers = Array.from(byTitle.entries())
      .map(([title, v]) => ({ title, ...v }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);
  }

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    newCustomers: newCustomers ?? 0,
    dailySeries,
    bestSellers,
  };
}

export async function getInventorySummary() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory")
    .select("quantity_on_hand, quantity_reserved, low_stock_threshold, stock_tracking_enabled, untracked_available, books ( title )");

  // Untracked products (see supabase/migrations/0011-0012) are excluded
  // from low/out-of-stock counts based on quantity_on_hand — that number
  // isn't meaningful for them. An untracked-and-unavailable product is
  // still counted as out of stock, since that's a real signal (the
  // WordPress source explicitly marked it unavailable), just not a
  // quantity-based one.
  const items = data ?? [];
  const tracked = items.filter((i) => i.stock_tracking_enabled);
  const lowStock = tracked.filter((i) => i.quantity_on_hand - i.quantity_reserved <= i.low_stock_threshold && i.quantity_on_hand - i.quantity_reserved > 0);
  const outOfStockTracked = tracked.filter((i) => i.quantity_on_hand - i.quantity_reserved <= 0);
  const outOfStockUntracked = items.filter((i) => !i.stock_tracking_enabled && !i.untracked_available);

  return {
    totalStockUnits: tracked.reduce((sum, i) => sum + i.quantity_on_hand, 0),
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStockTracked.length + outOfStockUntracked.length,
    untrackedCount: items.length - tracked.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lowStockItems: lowStock.slice(0, 10).map((i: any) => ({ title: i.books?.title ?? "Unknown", available: i.quantity_on_hand - i.quantity_reserved })),
  };
}
