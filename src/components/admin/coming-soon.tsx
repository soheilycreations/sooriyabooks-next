import { AdminPageHeader } from "@/components/admin/page-header";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <AdminPageHeader title={title} />
      <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        {description}
      </div>
    </div>
  );
}
