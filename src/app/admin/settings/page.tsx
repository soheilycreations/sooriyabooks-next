import { requireStaff } from "@/lib/auth/session";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { getSiteSettings } from "@/lib/settings/actions";

export default async function AdminSettingsPage() {
  await requireStaff(["admin"]);
  const settings = await getSiteSettings();

  return (
    <div>
      <AdminPageHeader
        title="Settings"
        description="Social media links shown as icons in the site footer. Leave a field blank to hide that icon."
      />
      <SiteSettingsForm initial={settings} />
      <p className="mt-8 max-w-xl text-sm text-muted-foreground">
        More store-wide settings (branding, contact info, tax rules) are next up.
      </p>
    </div>
  );
}
