import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, grand_total, placed_at")
    .order("placed_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl">My Orders</h1>
      {!orders || orders.length === 0 ? (
        <p className="text-muted-foreground">You haven&apos;t placed any orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-secondary/40"
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
