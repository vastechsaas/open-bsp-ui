import { createFileRoute, Outlet } from "@tanstack/react-router";
import SettingsWorkspaceLayout from "@/components/settings/SettingsWorkspaceLayout";

export const Route = createFileRoute("/_auth/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  return (
    <SettingsWorkspaceLayout>
      <Outlet />
    </SettingsWorkspaceLayout>
  );
}
