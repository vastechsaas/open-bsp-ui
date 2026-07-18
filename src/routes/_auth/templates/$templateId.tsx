import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import TemplateEditor from "@/components/TemplateEditor";
import { useTranslation } from "@/hooks/useTranslation";
import { useTemplateRecord } from "@/queries/useTemplates";

export const Route = createFileRoute("/_auth/templates/$templateId")({
  component: TemplateDetails,
});

function TemplateDetails() {
  const { translate: t } = useTranslation();
  const { templateId } = Route.useParams();
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
      organizationAddress={template.organization_address}
    />
  );
}
