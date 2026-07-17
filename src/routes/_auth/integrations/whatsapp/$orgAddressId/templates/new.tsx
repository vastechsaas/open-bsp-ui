import { createFileRoute } from "@tanstack/react-router";
import TemplateEditor from "@/components/TemplateEditor";

export const Route = createFileRoute(
  "/_auth/integrations/whatsapp/$orgAddressId/templates/new",
)({
  component: NewTemplate,
});

function NewTemplate() {
  const { orgAddressId } = Route.useParams();

  return <TemplateEditor organizationAddress={orgAddressId} />;
}
