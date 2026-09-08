import { createFileRoute } from "@tanstack/react-router";
import PlatformOrganizationLifecycleScreen from "@/components/platform/PlatformOrganizationLifecycle";

export const Route = createFileRoute("/platform/organizations")({
  component: PlatformOrganizationLifecycleScreen,
});
