import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/settings/members/")({
  beforeLoad: () => {
    throw redirect({ to: "/team-members" });
  },
});
