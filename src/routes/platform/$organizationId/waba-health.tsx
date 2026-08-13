import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/platform/$organizationId/waba-health")({
  component: PlatformWhatsAppHealthLayout,
});

function PlatformWhatsAppHealthLayout() {
  return <Outlet />;
}
