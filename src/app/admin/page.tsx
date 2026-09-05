import Link from "next/link";
import Image from "next/image";
import { ImageOff, TrendingUp, TrendingDown } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DateFilter } from "@/components/admin/date-filter";
import { SalesChart } from "@/components/admin/sales-chart";
import { TrafficChart } from "@/components/admin/traffic-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSalesReport, resolveDateRange, previousPeriod, growthPercent } from "@/lib/reports/queries";
import { getTrafficReport } from "@/lib/reports/traffic";
import { resolveCoverUrl } from "@/lib/catalog/queries";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "secondary" | "success" | "destructive" | "outline"> = {
  pending_payment: "outline",
  processing: "secondary",
  confirmed: "secondary",
  packed: "secondary",
  shipped: "secondary",
  delivered: "success",
  cancelled: "destructive",
  refunded: "destructive",
  failed: "destructive",
};

async function getAllTimeCounts() {
  const supabase = await createClient();
  const [{ count: bookCount }, { count: orderCount }, { count: customerCount }] = await Promise.all([
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ]);
  return { books: bookCount ?? 0, orders: orderCount ?? 0, customers: customerCount ?? 0 };
}

async function getRecentOrders() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, grand_total, placed_at,
       order_items ( books ( book_images ( is_primary, sort_order, media_assets ( storage_path ) ) ) )`,
    )
    .order("placed_at", { ascending: false })
    .limit(6);
  return data ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function firstOrderCover(orderItems: any[] | null): string | null {
  for (const item of orderItems ?? []) {
    const images = item.books?.book_images ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const primary = [...images].sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];
    const url = resolveCoverUrl(primary?.media_assets?.storage_path ?? null);
    if (url) return url;
  }
  return null;
}

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        positive ? "text-emerald-600" : "text-destructive",
      )}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}% vs previous period
    </span>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireStaff();
  const { range = "month", from, to } = await searchParams;
  const dateRange = resolveDateRange(range, from, to);
  const prevRange = previousPeriod(dateRange);
  const todayRange = resolveDateRange("today");

  const [counts, report, prevReport, traffic, prevTraffic, todayReport, recentOrders] = await Promise.all([
    getAllTimeCounts(),
    getSalesReport(dateRange),
    getSalesReport(prevRange),
    getTrafficReport(dateRange),
    getTrafficReport(prevRange),
    getSalesReport(todayRange),
    getRecentOrders(),
  ]);

  const revenueGrowth = growthPercent(report.totalRevenue, prevReport.totalRevenue);
  const ordersGrowth = growthPercent(report.totalOrders, prevReport.totalOrders);
  const visitorsGrowth = growthPercent(traffic.uniqueVisitors, prevTraffic.uniqueVisitors);

  return (
    <div>
      <AdminPageHeader title="Dashboard" description="Store performance at a glance." />

      {/* Always "today", regardless of the period selector below — the one
          thing staff open this page to check first thing in the morning. */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Orders</CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-semibold">{todayReport.totalOrders}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Revenue</CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-semibold">{formatCurrency(todayReport.totalRevenue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {range === "today" ? traffic.uniqueVisitors : "—"}
            </p>
            {range !== "today" && <p className="mt-0.5 text-xs text-muted-foreground">Switch to &quot;Today&quot; below to see this live.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        <p className="font-heading text-lg">Performance</p>
        <DateFilter current={range} basePath="/admin" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(report.totalRevenue)}</p>
            <GrowthBadge value={revenueGrowth} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Orders</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{report.totalOrders}</p>
            <GrowthBadge value={ordersGrowth} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">New Customers</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{report.newCustomers}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Unique Visitors</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{traffic.uniqueVisitors}</p>
            <GrowthBadge value={visitorsGrowth} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Revenue Over Time</CardTitle></CardHeader>
          <CardContent><SalesChart data={report.dailySeries} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Best Sellers</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {report.bestSellers.length === 0 && <p className="text-muted-foreground">No sales in this period.</p>}
            {report.bestSellers.slice(0, 6).map((b, i) => (
              <div key={i} className="flex items-center gap-3 border-b py-2 last:border-0">
                <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-sm bg-secondary">
                  {b.coverUrl ? (
                    <Image src={b.coverUrl} alt="" fill sizes="36px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageOff className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate">{b.title}</span>
                <span className="shrink-0 text-muted-foreground">{b.quantitySold} sold</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Traffic</CardTitle></CardHeader>
          <CardContent><TrafficChart data={traffic.dailySeries} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top Pages</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {traffic.topPages.length === 0 && <p className="text-muted-foreground">No traffic recorded in this period.</p>}
            {traffic.topPages.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
                <span className="min-w-0 flex-1 truncate text-xs">{p.path}</span>
                <span className="shrink-0 text-muted-foreground">{p.views} views</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link href="/admin/orders" className="text-sm text-accent hover:underline">View all</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentOrders.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
          {recentOrders.map((o) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const coverUrl = firstOrderCover(o.order_items as any[] | null);
            return (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="flex items-center gap-3 rounded-md border-b py-2 last:border-0 hover:bg-secondary/50"
              >
                <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-sm bg-secondary">
                  {coverUrl ? (
                    <Image src={coverUrl} alt="" fill sizes="36px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageOff className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(o.placed_at)}</p>
                </div>
                <span className="shrink-0 text-sm">{formatCurrency(Number(o.grand_total))}</span>
                <Badge variant={STATUS_VARIANT[o.status] ?? "outline"} className="shrink-0 capitalize">
                  {o.status.replace(/_/g, " ")}
                </Badge>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Books</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{counts.books}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Orders (all time)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{counts.orders}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{counts.customers}</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
