import { requireStaff } from "@/lib/auth/session";
import { ComingSoon } from "@/components/admin/coming-soon";

export default async function AdminSettingsPage() {
  await requireStaff(["admin"]);
  return (
    <ComingSoon
      title="Settings"
      description="Store-wide settings (branding, contact info, tax rules) are next up."
    />
  );
}
