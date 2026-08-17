import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";

export default async function AdminPaymentsPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data: providers } = await supabase.from("payment_providers").select("*").order("sort_order");

  return (
    <div>
      <AdminPageHeader
        title="Payment Settings"
        description="Payment methods available at checkout. Bank IPG credentials are configured via server environment variables (BANK_IPG_MERCHANT_ID / BANK_IPG_SECRET), never stored in the database — see docs/architecture.md §6."
      />
      <div className="space-y-3">
        {(providers ?? []).map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">{p.display_name}</p>
              <p className="text-xs text-muted-foreground">{p.id}</p>
            </div>
            {p.is_enabled ? <Badge variant="success">Enabled</Badge> : <Badge variant="outline">Disabled</Badge>}
          </div>
        ))}
      </div>
    </div>
  );
}
