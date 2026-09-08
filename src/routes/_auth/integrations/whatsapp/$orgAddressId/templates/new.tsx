import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_auth/integrations/whatsapp/$orgAddressId/templates/new",
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/templates/new",
      search: { account: params.orgAddressId },
    });
  },
});
