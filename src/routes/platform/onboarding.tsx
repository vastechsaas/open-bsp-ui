import { createFileRoute } from "@tanstack/react-router";
import PlatformOrganizationOnboarding from "@/components/platform/PlatformOrganizationOnboarding";

export const Route = createFileRoute("/platform/onboarding")({
  component: PlatformOrganizationOnboarding,
});
