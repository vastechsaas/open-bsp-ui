import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "@/hooks/useTranslation";
import TemplateEditor from "@/components/TemplateEditor";
import { useTemplateRecord } from "@/queries/useTemplates";
import { LoaderCircle } from "lucide-react";

export const Route = createFileRoute(
  "/_auth/integrations/whatsapp/$orgAddressId/templates/$templateId",
)({
  component: EditTemplate,
});

function EditTemplate() {
  const { translate: t } = useTranslation();
  const { orgAddressId, templateId } = Route.useParams();

  const { data: template, isLoading, isError } = useTemplateRecord(templateId);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !template) {
    return (
      <div className="p-4 text-muted-foreground">
        {t("Plantilla no encontrada")}
      </div>
    );
  }

  return (
    <TemplateEditor
      existingTemplate={template}
      organizationAddress={orgAddressId}
    />
  );
}
