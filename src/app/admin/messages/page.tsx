import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { formatDate } from "@/lib/utils";

export default async function AdminMessagesPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data: messages } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(100);

  return (
    <div>
      <AdminPageHeader title="Contact Messages" />
      <div className="space-y-3">
        {(messages ?? []).map((m) => (
          <div key={m.id} className="rounded-lg border p-4 text-sm">
            <div className="flex justify-between">
              <p className="font-medium">{m.name} &lt;{m.email}&gt;</p>
              <p className="text-muted-foreground">{formatDate(m.created_at)}</p>
            </div>
            <p className="mt-2 text-muted-foreground">{m.message}</p>
          </div>
        ))}
        {(!messages || messages.length === 0) && <p className="text-sm text-muted-foreground">No messages yet.</p>}
      </div>
    </div>
  );
}
