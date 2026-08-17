import { requireStaff } from "@/lib/auth/session";
import { listMedia } from "@/lib/media/actions";
import { AdminPageHeader } from "@/components/admin/page-header";
import { MediaLibraryClient } from "./media-library-client";

export default async function AdminMediaPage() {
  await requireStaff();
  const media = await listMedia(120);

  return (
    <div>
      <AdminPageHeader title="Media Library" description="Images used across products, authors, publishers, and the homepage." />
      <MediaLibraryClient initialMedia={media.map((m) => ({ id: m.id, url: m.url, altText: m.altText }))} />
    </div>
  );
}
