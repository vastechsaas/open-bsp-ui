import { createFileRoute } from "@tanstack/react-router";
import MediaStoragePanel from "@/components/settings/MediaStoragePanel";
import { useOrganizationMediaStorage } from "@/queries/useMediaStorage";

export const Route = createFileRoute("/_auth/settings/media-management")({
  component: MediaManagementSettings,
});

function MediaManagementSettings() {
  const storage = useOrganizationMediaStorage();
  return (
    <MediaStoragePanel
      data={storage.data}
      loading={storage.isPending}
      error={storage.isError}
    />
  );
}
