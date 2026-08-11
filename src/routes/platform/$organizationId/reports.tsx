import { createFileRoute } from "@tanstack/react-router";
import PlatformReports from "@/components/platform/PlatformReports";

export const Route = createFileRoute("/platform/$organizationId/reports")({
  component: PlatformReportsRoute,
});

function PlatformReportsRoute() {
  const { organizationId } = Route.useParams();
  return <PlatformReports organizationId={organizationId} />;
}
