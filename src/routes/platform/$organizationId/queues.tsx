import { createFileRoute } from "@tanstack/react-router";
import PlatformOrganizationQueues from "@/components/platform/PlatformOrganizationQueues";

export const Route = createFileRoute("/platform/$organizationId/queues")({
  component: PlatformOrganizationQueuesRoute,
});

function PlatformOrganizationQueuesRoute() {
  const { organizationId } = Route.useParams();
  return <PlatformOrganizationQueues organizationId={organizationId} />;
}
