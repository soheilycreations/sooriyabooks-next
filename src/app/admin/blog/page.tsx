import { requireStaff } from "@/lib/auth/session";
import { ComingSoon } from "@/components/admin/coming-soon";

export default async function AdminBlogPage() {
  await requireStaff();
  return (
    <ComingSoon
      title="Blog"
      description="Blog post management is next up. The database schema (blog_posts table) is already in place — see supabase/migrations/0001_init_schema.sql."
    />
  );
}
