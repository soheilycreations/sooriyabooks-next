import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveCoverUrl } from "@/lib/catalog/queries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { OrderStatusControl } from "./status-control";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function itemCoverUrl(item: any): string | null {
  const images = item.books?.book_images ?? [];
  const primary = [...images].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  )[0];
  return resolveCoverUrl(primary?.media_assets?.storage_path ?? null);
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: order }, { data: items }, { data: history }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, profiles ( full_name, phone ), addresses:shipping_address_id ( recipient_name, phone, line1, line2, postal_code, shipping_cities ( name ) )")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("order_items")
      .select("*, books ( book_images ( is_primary, sort_order, media_assets ( storage_path ) ) )")
      .eq("order_id", id),
    supabase.from("order_status_history").select("status, note, changed_at").eq("order_id", id).order("changed_at"),
  ]);

  if (!order) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = order as any;

  return (
    <div>
      <AdminPageHeader title={`Order ${o.order_number}`} description={formatDate(o.placed_at)} />
      <div className="mb-6">
        <OrderStatusControl orderId={id} currentStatus={o.status} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(items ?? []).map((item) => {
              const coverUrl = itemCoverUrl(item);
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-sm bg-secondary">
                      {coverUrl ? (
                        <Image src={coverUrl} alt="" fill sizes="40px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="truncate">{item.title_snapshot} &times; {item.quantity}</span>
                  </div>
                  <span className="shrink-0">{formatCurrency(Number(item.line_total))}</span>
                </div>
              );
            })}
            <div className="space-y-1 border-t pt-3">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(Number(o.subtotal))}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{formatCurrency(Number(o.shipping_total))}</span></div>
              {Number(o.discount_total) > 0 && (
                <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>-{formatCurrency(Number(o.discount_total))}</span></div>
              )}
              <div className="flex justify-between font-medium"><span>Total</span><span>{formatCurrency(Number(o.grand_total))}</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{o.profiles?.full_name || "Guest"}</p>
              <p className="text-muted-foreground">{o.profiles?.phone}</p>
              {o.customer_id && (
                <Link href={`/admin/customers/${o.customer_id}`} className="text-accent hover:underline">View customer</Link>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Shipping Address</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {o.addresses ? (
                <>
                  <p>{o.addresses.recipient_name}</p>
                  <p className="text-muted-foreground">{o.addresses.line1}{o.addresses.line2 ? `, ${o.addresses.line2}` : ""}</p>
                  <p className="text-muted-foreground">{o.addresses.shipping_cities?.name}</p>
                  <p className="text-muted-foreground">{o.addresses.phone}</p>
                </>
              ) : (
                <p className="text-muted-foreground">No address on file.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>History</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(history ?? []).map((h, i) => (
                <div key={i} className="border-b pb-2 last:border-0">
                  <p className="font-medium capitalize">{h.status.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(h.changed_at)}{h.note ? ` — ${h.note}` : ""}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
