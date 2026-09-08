import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/settings/members/new")({
  beforeLoad: () => {
    throw redirect({ to: "/team-members" });
  },
});
