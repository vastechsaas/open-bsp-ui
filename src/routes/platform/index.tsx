import { createFileRoute } from "@tanstack/react-router";
import PlatformOverview from "@/components/platform/PlatformOverview";

export const Route = createFileRoute("/platform/")({
  component: PlatformOverview,
});
