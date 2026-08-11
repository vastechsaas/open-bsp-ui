import { createFileRoute } from "@tanstack/react-router";
import PlatformTenantSummary from "@/components/platform/PlatformTenantSummary";

export const Route = createFileRoute("/platform/$organizationId/")({
  component: PlatformTenantRoute,
});

function PlatformTenantRoute() {
  const { organizationId } = Route.useParams();
  return <PlatformTenantSummary organizationId={organizationId} />;
}
