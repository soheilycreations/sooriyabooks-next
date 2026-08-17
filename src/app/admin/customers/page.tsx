import { requireStaff } from "@/lib/auth/session";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

async function getEmailsByUserId(userIds: string[]): Promise<Record<string, string>> {
  // Requires SUPABASE_SERVICE_ROLE_KEY (auth.users isn't queryable via the
  // RLS-scoped client). Degrades gracefully if the key isn't configured yet.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return {};
  try {
    const admin = createServiceRoleClient();
    const emails: Record<string, string> = {};
    // listUsers is paginated; a customer base this size fits in a couple of pages.
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data || data.users.length === 0) break;
      for (const u of data.users) {
        if (userIds.includes(u.id)) emails[u.id] = u.email ?? "";
      }
      if (data.users.length < 1000) break;
    }
    return emails;
  } catch {
    return {};
  }
}

export default async function AdminCustomersPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone, is_blocked, blocked_reason, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const emails = await getEmailsByUserId((profiles ?? []).map((p) => p.id));

  return (
    <div>
      <AdminPageHeader title="Customers" description="Most recent 200 accounts." />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3 font-medium">{p.full_name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{emails[p.id] || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.phone || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(p.created_at)}</td>
                <td className="px-4 py-3">
                  {p.is_blocked ? <Badge variant="destructive">Blocked</Badge> : <Badge variant="success">Active</Badge>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/customers/${p.id}`} className="text-accent hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!profiles || profiles.length === 0) && <p className="p-8 text-center text-sm text-muted-foreground">No customers yet.</p>}
      </div>
    </div>
  );
}
