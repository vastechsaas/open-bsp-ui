import { createFileRoute } from "@tanstack/react-router";
import PlatformReports from "@/components/platform/PlatformReports";

export const Route = createFileRoute("/platform/reports/$organizationId")({
  component: PlatformReportsRoute,
});

function PlatformReportsRoute() {
  const { organizationId } = Route.useParams();
  return <PlatformReports organizationId={organizationId} />;
}
