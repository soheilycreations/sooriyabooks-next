import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

async function getDashboardCounts() {
  const supabase = await createClient();
  const [{ count: bookCount }, { count: orderCount }, { count: customerCount }] = await Promise.all([
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ]);
  return {
    books: bookCount ?? 0,
    orders: orderCount ?? 0,
    customers: customerCount ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const counts = await getDashboardCounts();

  const stats = [
    { label: "Total Books", value: counts.books },
    { label: "Total Orders", value: counts.orders },
    { label: "Total Customers", value: counts.customers },
  ];

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Sales/revenue charts and date-filtered reports land in Phase 4 (see docs/feature-list.md).
      </p>
    </div>
  );
}
