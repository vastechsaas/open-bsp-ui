import { createFileRoute } from "@tanstack/react-router";
import PlatformCampaignPolicy from "@/components/platform/PlatformCampaignPolicy";
export const Route = createFileRoute(
  "/platform/$organizationId/campaign-controls",
)({ component: CampaignControls });
function CampaignControls() {
  const { organizationId } = Route.useParams();
  return <PlatformCampaignPolicy organizationId={organizationId} />;
}
