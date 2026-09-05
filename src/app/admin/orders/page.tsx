import Link from "next/link";
import Image from "next/image";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { resolveCoverUrl } from "@/lib/catalog/queries";
import { formatCurrency, formatDate } from "@/lib/utils";

interface OrderItemImage {
  books: {
    book_images: { is_primary: boolean; sort_order: number; media_assets: { storage_path: string } | null }[] | null;
  } | null;
}

function orderCovers(orderItems: OrderItemImage[] | null, max = 3): string[] {
  const urls: string[] = [];
  for (const item of orderItems ?? []) {
    const images = item.books?.book_images ?? [];
    const primary = [...images].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
    )[0];
    const url = resolveCoverUrl(primary?.media_assets?.storage_path ?? null);
    if (url) urls.push(url);
    if (urls.length >= max) break;
  }
  return urls;
}

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

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff();
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      `id, order_number, status, payment_method, payment_status, grand_total, placed_at,
       order_items ( books ( book_images ( is_primary, sort_order, media_assets ( storage_path ) ) ) )`,
    )
    .order("placed_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status as never);

  const { data: orders } = await query;

  const statuses = ["pending_payment", "confirmed", "packed", "shipped", "delivered", "cancelled", "refunded", "failed"];

  return (
    <div>
      <AdminPageHeader title="Orders" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/orders" className={`rounded-full px-3 py-1 text-xs ${!status ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`rounded-full px-3 py-1 text-xs capitalize ${status === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
          >
            {s.replace(/_/g, " ")}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3" />
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => {
              const covers = orderCovers(o.order_items as OrderItemImage[] | null);
              return (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex -space-x-2">
                    {covers.length > 0 ? (
                      covers.map((url, i) => (
                        <div key={i} className="relative h-10 w-7 shrink-0 overflow-hidden rounded-sm border-2 border-card bg-secondary">
                          <Image src={url} alt="" fill sizes="28px" className="object-cover" />
                        </div>
                      ))
                    ) : (
                      <div className="h-10 w-7 shrink-0 rounded-sm bg-secondary" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-accent">{o.order_number}</Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(o.placed_at)}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{o.payment_method.replace(/_/g, " ")} · {o.payment_status}</td>
                <td className="px-4 py-3">{formatCurrency(Number(o.grand_total))}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[o.status] ?? "outline"} className="capitalize">
                    {o.status.replace(/_/g, " ")}
                  </Badge>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {(!orders || orders.length === 0) && <p className="p-8 text-center text-sm text-muted-foreground">No orders found.</p>}
      </div>
    </div>
  );
}
