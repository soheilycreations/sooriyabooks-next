import { requireStaff } from "@/lib/auth/session";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PublisherForm } from "@/components/admin/publisher-form";

export default async function NewPublisherPage() {
  await requireStaff();
  return (
    <div>
      <AdminPageHeader title="New Publisher" />
      <PublisherForm />
    </div>
  );
}
