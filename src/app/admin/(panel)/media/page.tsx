import { requireAdminPage, can } from "@/lib/auth/guard";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/media-library";

export const metadata = { title: "Media Library" };

export default async function MediaPage() {
  const ctx = await requireAdminPage(["media.read", "media.manage"]);
  return (
    <div>
      <PageHeader title="Media Library" description="Images are stored on Cloudinary via signed uploads (JPEG, PNG, WebP, AVIF; 2 MB for logos/QR/avatars, 8 MB otherwise). Images in use cannot be deleted." />
      <MediaLibrary canManage={can(ctx, "media.manage")} uploadsEnabled={env.cloudinary.enabled} />
    </div>
  );
}
