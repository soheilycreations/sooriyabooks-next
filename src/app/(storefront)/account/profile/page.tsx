import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <div>
      <h1 className="font-heading text-2xl leading-tight">Profile</h1>

      <dl className="mt-6 max-w-sm space-y-4 rounded-lg border p-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Full name</dt>
          <dd className="mt-0.5 font-medium">{profile?.full_name || "—"}</dd>
        </div>
        <div className="border-t pt-4">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="mt-0.5 font-medium">{user?.email}</dd>
        </div>
        <div className="border-t pt-4">
          <dt className="text-muted-foreground">Phone</dt>
          <dd className="mt-0.5 font-medium">{profile?.phone || "—"}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        Profile editing and password change are coming in the next milestone.
      </p>
    </div>
  );
}
