import { createFileRoute } from "@tanstack/react-router";
import PlatformIntegrationAvailability from "@/components/platform/PlatformIntegrationAvailability";

export const Route = createFileRoute("/platform/$organizationId/integrations")({
  component: Integrations,
});
function Integrations() {
  const { organizationId } = Route.useParams();
  return <PlatformIntegrationAvailability organizationId={organizationId} />;
}
