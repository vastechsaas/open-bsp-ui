import { createFileRoute } from "@tanstack/react-router";
import PlatformWhatsAppHealthDetail from "@/components/platform/PlatformWhatsAppHealthDetail";

export const Route = createFileRoute(
  "/platform/$organizationId/waba-health/$phoneNumberId",
)({
  component: PlatformWhatsAppHealthDetailRoute,
});

function PlatformWhatsAppHealthDetailRoute() {
  const { organizationId, phoneNumberId } = Route.useParams();
  return (
    <PlatformWhatsAppHealthDetail
      organizationId={organizationId}
      phoneNumberId={phoneNumberId}
    />
  );
}
