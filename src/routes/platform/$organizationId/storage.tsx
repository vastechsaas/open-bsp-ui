import { createFileRoute } from "@tanstack/react-router";
import PlatformOrganizationMediaStorage from "@/components/platform/PlatformOrganizationMediaStorage";

export const Route = createFileRoute("/platform/$organizationId/storage")({
  component: PlatformOrganizationMediaStorageRoute,
});

function PlatformOrganizationMediaStorageRoute() {
  const { organizationId } = Route.useParams();
  return <PlatformOrganizationMediaStorage organizationId={organizationId} />;
}
