import Link from "next/link";
import { Pencil } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { Badge } from "@/components/ui/badge";
import { deleteCoupon } from "@/lib/pricing/actions";
import { formatDate } from "@/lib/utils";

export default async function AdminCouponsPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data: coupons } = await supabase
    .from("coupons")
    .select("id, code, type, value, scope, usage_limit, usage_count, is_active, expires_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <AdminPageHeader title="Coupons" actionLabel="New Coupon" actionHref="/admin/coupons/new" />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Scope</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(coupons ?? []).map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-3 font-mono font-medium">{c.code}</td>
                <td className="px-4 py-3">{c.type === "percentage" ? `${c.value}%` : `LKR ${c.value}`}</td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{c.scope}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.usage_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.expires_at ? formatDate(c.expires_at) : "—"}</td>
                <td className="px-4 py-3">{c.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/coupons/${c.id}`} className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <DeleteButton action={deleteCoupon.bind(null, c.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!coupons || coupons.length === 0) && <p className="p-8 text-center text-sm text-muted-foreground">No coupons yet.</p>}
      </div>
    </div>
  );
}
