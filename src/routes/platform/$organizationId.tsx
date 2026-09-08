import { createFileRoute } from "@tanstack/react-router";
import PlatformOrganizationDetailLayout from "@/components/platform/PlatformOrganizationDetailLayout";

export const Route = createFileRoute("/platform/$organizationId")({
  component: PlatformOrganizationDetailRoute,
});

function PlatformOrganizationDetailRoute() {
  const { organizationId } = Route.useParams();
  return <PlatformOrganizationDetailLayout organizationId={organizationId} />;
}
