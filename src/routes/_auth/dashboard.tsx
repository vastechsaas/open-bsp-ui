import { createFileRoute } from "@tanstack/react-router";
import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardWorkspace,
});
