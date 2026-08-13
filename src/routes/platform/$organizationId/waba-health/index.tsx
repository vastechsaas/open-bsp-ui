import { createFileRoute } from "@tanstack/react-router";
import PlatformWhatsAppHealth from "@/components/platform/PlatformWhatsAppHealth";

export const Route = createFileRoute("/platform/$organizationId/waba-health/")({
  component: PlatformWhatsAppHealthRoute,
});

function PlatformWhatsAppHealthRoute() {
  const { organizationId } = Route.useParams();
  return <PlatformWhatsAppHealth organizationId={organizationId} />;
}
