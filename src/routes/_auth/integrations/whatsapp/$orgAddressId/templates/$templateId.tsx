import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_auth/integrations/whatsapp/$orgAddressId/templates/$templateId",
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/templates/$templateId",
      params: { templateId: params.templateId },
    });
  },
});
