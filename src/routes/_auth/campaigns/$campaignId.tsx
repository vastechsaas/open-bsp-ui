import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/campaigns/$campaignId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/campaigns/$campaignId/edit",
      params: { campaignId: params.campaignId },
    });
  },
});
