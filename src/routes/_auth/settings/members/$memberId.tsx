import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/settings/members/$memberId")({
  beforeLoad: () => {
    throw redirect({ to: "/team-members" });
  },
});
