import { requireStaff } from "@/lib/auth/session";
import { ComingSoon } from "@/components/admin/coming-soon";

export default async function AdminSeoPage() {
  await requireStaff();
  return (
    <ComingSoon
      title="SEO"
      description="Per-page SEO overrides already exist on Products, Categories, Authors, and Publishers (edit them from those screens). A consolidated sitemap/redirects dashboard is next."
    />
  );
}
