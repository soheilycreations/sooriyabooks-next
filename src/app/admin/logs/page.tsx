import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { formatDate } from "@/lib/utils";

export default async function AdminLogsPage() {
  await requireStaff(["admin"]);
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <AdminPageHeader title="System Logs" description="Staff mutation audit trail (admins only)." />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                <td className="px-4 py-3 text-muted-foreground">{log.entity_type} {log.entity_id ? `#${log.entity_id.slice(0, 8)}` : ""}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(log.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!logs || logs.length === 0) && <p className="p-8 text-center text-sm text-muted-foreground">No activity logged yet.</p>}
      </div>
    </div>
  );
}
