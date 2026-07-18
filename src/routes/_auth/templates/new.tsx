import { createFileRoute } from "@tanstack/react-router";
import TemplateEditor from "@/components/TemplateEditor";

type NewTemplateSearch = {
  account?: string;
};

export const Route = createFileRoute("/_auth/templates/new")({
  validateSearch: (search: Record<string, unknown>): NewTemplateSearch => ({
    account: typeof search.account === "string" ? search.account : undefined,
  }),
  component: NewTemplate,
});

function NewTemplate() {
  const { account } = Route.useSearch();
  return <TemplateEditor organizationAddress={account || ""} />;
}
