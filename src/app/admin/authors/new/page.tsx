import { requireStaff } from "@/lib/auth/session";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AuthorForm } from "@/components/admin/author-form";

export default async function NewAuthorPage() {
  await requireStaff();
  return (
    <div>
      <AdminPageHeader title="New Author" />
      <AuthorForm />
    </div>
  );
}
