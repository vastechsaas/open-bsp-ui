import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { fetchIsPlatformAdmin } from "@/queries/usePlatformAdmin";

export const Route = createFileRoute("/platform")({
  beforeLoad: async () => {
    if (!(await fetchIsPlatformAdmin())) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: () => (
    <PlatformLayout>
      <Outlet />
    </PlatformLayout>
  ),
});
