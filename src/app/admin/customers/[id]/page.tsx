import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BlockCustomerControl } from "./block-form";

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: profile }, { data: orders }, { data: addresses }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("orders").select("id, order_number, status, grand_total, placed_at").eq("customer_id", id).order("placed_at", { ascending: false }),
    supabase.from("addresses").select("id, label, recipient_name, phone, line1, line2").eq("customer_id", id),
  ]);

  if (!profile) notFound();

  const totalSpent = (orders ?? []).reduce((sum, o) => sum + Number(o.grand_total), 0);

  return (
    <div>
      <AdminPageHeader title={profile.full_name || "Customer"} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Phone:</span> {profile.phone || "—"}</p>
            <p><span className="text-muted-foreground">Joined:</span> {formatDate(profile.created_at)}</p>
            <p><span className="text-muted-foreground">Orders:</span> {orders?.length ?? 0}</p>
            <p><span className="text-muted-foreground">Total spent:</span> {formatCurrency(totalSpent)}</p>
            {profile.is_blocked && (
              <p className="text-destructive">Blocked: {profile.blocked_reason}</p>
            )}
            <div className="pt-2">
              <BlockCustomerControl customerId={id} isBlocked={profile.is_blocked} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Addresses</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(addresses ?? []).length === 0 && <p className="text-muted-foreground">No saved addresses.</p>}
            {(addresses ?? []).map((a) => (
              <div key={a.id} className="border-b pb-2 last:border-0">
                <p className="font-medium">{a.label || a.recipient_name}</p>
                <p className="text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                <p className="text-muted-foreground">{a.phone}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(orders ?? []).length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
            {(orders ?? []).map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between border-b py-2 last:border-0 hover:text-accent">
                <span>{o.order_number}</span>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(Number(o.grand_total))}</span>
                  <Badge variant="secondary" className="capitalize">{o.status.replace(/_/g, " ")}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
