import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { StockAdjustControl } from "./stock-adjust";
import { TrackingControl } from "./tracking-control";

export default async function AdminInventoryPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory")
    .select("book_id, quantity_on_hand, quantity_reserved, low_stock_threshold, stock_tracking_enabled, untracked_available, books ( title, sku )")
    .order("quantity_on_hand", { ascending: true })
    .limit(200);

  return (
    <div>
      <AdminPageHeader
        title="Inventory"
        description="Real stock levels, reservations, manual adjustments, and stock-tracking mode per product."
      />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Tracking</th>
              <th className="px-4 py-3">On Hand</th>
              <th className="px-4 py-3">Reserved</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Manage</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(data ?? []).map((inv: any) => {
              const tracked = inv.stock_tracking_enabled;
              const available = tracked ? inv.quantity_on_hand - inv.quantity_reserved : null;

              return (
                <tr key={inv.book_id} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-medium">{inv.books?.title}</p>
                    <p className="text-xs text-muted-foreground">{inv.books?.sku}</p>
                  </td>
                  <td className="px-4 py-3">
                    {tracked ? (
                      <Badge variant="secondary">Tracked</Badge>
                    ) : (
                      <Badge variant="outline">Untracked</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">{tracked ? inv.quantity_on_hand : "—"}</td>
                  <td className="px-4 py-3">{tracked ? inv.quantity_reserved : "—"}</td>
                  <td className="px-4 py-3 font-medium">{tracked ? available : "—"}</td>
                  <td className="px-4 py-3">
                    {tracked ? (
                      available !== null && available <= 0 ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : available !== null && available <= inv.low_stock_threshold ? (
                        <Badge variant="secondary">Low Stock</Badge>
                      ) : (
                        <Badge variant="success">In Stock</Badge>
                      )
                    ) : inv.untracked_available ? (
                      <Badge variant="success">In Stock (untracked)</Badge>
                    ) : (
                      <Badge variant="destructive">Out of Stock (untracked)</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {tracked ? (
                      <div className="flex items-center gap-2">
                        <StockAdjustControl bookId={inv.book_id} />
                        <TrackingControl bookId={inv.book_id} trackingEnabled untrackedAvailable={inv.untracked_available} />
                      </div>
                    ) : (
                      <TrackingControl bookId={inv.book_id} trackingEnabled={false} untrackedAvailable={inv.untracked_available} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!data || data.length === 0) && <p className="p-8 text-center text-sm text-muted-foreground">No inventory records yet.</p>}
      </div>
    </div>
  );
}
