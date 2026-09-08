import { createFileRoute } from "@tanstack/react-router";
import PlatformOrganizationAgents from "@/components/platform/PlatformOrganizationAgents";

export const Route = createFileRoute("/platform/$organizationId/agents")({
  component: PlatformOrganizationAgentsRoute,
});

function PlatformOrganizationAgentsRoute() {
  const { organizationId } = Route.useParams();
  return <PlatformOrganizationAgents organizationId={organizationId} />;
}
