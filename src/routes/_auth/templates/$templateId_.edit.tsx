import { createFileRoute, Link } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import TemplateEditor from "@/components/TemplateEditor";
import { useTranslation } from "@/hooks/useTranslation";
import { useTemplateRecord } from "@/queries/useTemplates";
import { isSubmittedTemplateEditable } from "@/utils/TemplateDraftUtils";

export const Route = createFileRoute("/_auth/templates/$templateId_/edit")({
  component: TemplateEdit,
});

function TemplateEdit() {
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

  if (!isSubmittedTemplateEditable(template.status)) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold">
            {t("Esta plantilla no se puede editar")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("El estado actual de Meta permite únicamente verla.")}
          </p>
          <Link
            className="primary mt-5 inline-flex px-4 py-2"
            to="/templates/$templateId"
            params={{ templateId }}
          >
            {t("Ver plantilla")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TemplateEditor
      existingTemplate={template}
      organizationAddress={template.organization_address}
      submittedEdit
    />
  );
}
