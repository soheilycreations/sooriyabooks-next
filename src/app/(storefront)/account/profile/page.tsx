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
      <h1 className="mb-6 font-heading text-2xl">Profile</h1>
      <dl className="max-w-sm space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Full name</dt>
          <dd>{profile?.full_name || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd>{user?.email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Phone</dt>
          <dd>{profile?.phone || "—"}</dd>
        </div>
      </dl>
      <p className="mt-6 text-xs text-muted-foreground">
        Profile editing and password change are coming in the next milestone.
      </p>
    </div>
  );
}
