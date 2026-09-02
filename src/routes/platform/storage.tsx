import { createFileRoute } from "@tanstack/react-router";
import PlatformMediaStorage from "@/components/platform/PlatformMediaStorage";

export const Route = createFileRoute("/platform/storage")({
  component: PlatformMediaStorage,
});
