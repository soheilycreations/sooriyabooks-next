import Link from "next/link";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, grand_total, placed_at")
    .order("placed_at", { ascending: false });

  return (
    <div>
      <h1 className="font-heading text-2xl leading-tight">My Orders</h1>

      {!orders || orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Package className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">You haven&apos;t placed any orders yet.</p>
          <Button variant="outline" className="mt-2" asChild>
            <Link href="/search">Browse Books</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:border-accent hover:bg-accent/5"
            >
              <div>
                <p className="font-medium">{order.order_number}</p>
                <p className="text-sm text-muted-foreground">{formatDate(order.placed_at)}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium">{formatCurrency(Number(order.grand_total))}</span>
                <Badge variant="secondary" className="capitalize">
                  {order.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
