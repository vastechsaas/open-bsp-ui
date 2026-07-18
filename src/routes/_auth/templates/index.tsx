import { createFileRoute } from "@tanstack/react-router";
import { TemplatesIndex } from "@/routes/_auth/integrations/whatsapp/$orgAddressId/templates/index";

type TemplatesSearch = {
  account?: string;
};

export const Route = createFileRoute("/_auth/templates/")({
  validateSearch: (search: Record<string, unknown>): TemplatesSearch => ({
    account: typeof search.account === "string" ? search.account : undefined,
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const { account } = Route.useSearch();
  return <TemplatesIndex initialAccount={account} />;
}
