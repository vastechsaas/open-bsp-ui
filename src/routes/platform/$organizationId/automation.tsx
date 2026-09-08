import { createFileRoute } from "@tanstack/react-router";
import PlatformOrganizationAutomation from "@/components/platform/PlatformOrganizationAutomation";

export const Route = createFileRoute("/platform/$organizationId/automation")({
  component: PlatformOrganizationAutomationRoute,
});

function PlatformOrganizationAutomationRoute() {
  const { organizationId } = Route.useParams();
  return <PlatformOrganizationAutomation organizationId={organizationId} />;
}
