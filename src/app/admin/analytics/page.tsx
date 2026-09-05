import Image from "next/image";
import { ImageOff } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { getSalesReport, getInventorySummary, resolveDateRange } from "@/lib/reports/queries";
import { SalesChart } from "@/components/admin/sales-chart";
import { ExportCsvButton } from "@/components/admin/export-csv-button";
import { DateFilter } from "@/components/admin/date-filter";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireStaff();
  const { range = "month", from, to } = await searchParams;
  const dateRange = resolveDateRange(range, from, to);

  const [report, inventory] = await Promise.all([getSalesReport(dateRange), getInventorySummary()]);

  const stats = [
    { label: "Revenue", value: formatCurrency(report.totalRevenue) },
    { label: "Orders", value: report.totalOrders },
    { label: "Avg. Order Value", value: formatCurrency(report.averageOrderValue) },
    { label: "New Customers", value: report.newCustomers },
  ];

  return (
    <div>
      <AdminPageHeader title="Analytics" description="Sales performance and inventory health." />
      <div className="mb-6 flex items-center justify-between">
        <DateFilter current={range} />
        <ExportCsvButton filename={`sales-${range}.csv`} rows={report.dailySeries} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-semibold">{s.value}</p></CardContent>
          </Card>
        ))}
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
            {report.bestSellers.map((b, i) => (
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

      <Card className="mt-6">
        <CardHeader><CardTitle>Inventory Health</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4 text-sm">
            <p>Total tracked stock: <span className="font-medium">{inventory.totalStockUnits}</span></p>
            <p>Low stock: <Badge variant="secondary">{inventory.lowStockCount}</Badge></p>
            <p>Out of stock: <Badge variant="destructive">{inventory.outOfStockCount}</Badge></p>
            <p>Untracked products: <Badge variant="outline">{inventory.untrackedCount}</Badge></p>
          </div>
          {inventory.lowStockItems.length > 0 && (
            <div className="space-y-1 text-sm">
              {inventory.lowStockItems.map((item, i) => (
                <div key={i} className="flex justify-between border-b py-1 last:border-0">
                  <span>{item.title}</span>
                  <span className="text-muted-foreground">{item.available} left</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
