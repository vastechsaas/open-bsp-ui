import { createFileRoute } from "@tanstack/react-router";
import PlatformModulePermissions from "@/components/platform/PlatformModulePermissions";

export const Route = createFileRoute(
  "/platform/$organizationId/module-permissions",
)({ component: ModulePermissionsRoute });
function ModulePermissionsRoute() {
  const { organizationId } = Route.useParams();
  return <PlatformModulePermissions organizationId={organizationId} />;
}
