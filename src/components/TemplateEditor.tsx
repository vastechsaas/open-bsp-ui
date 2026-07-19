import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { message } from "antd";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import CampaignFilterSelect from "./campaigns/CampaignFilterSelect";
import TemplatePreview from "./TemplatePreview";
import { useTranslation } from "@/hooks/useTranslation";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import {
  type TemplateRecord,
  useCreateTemplateDraft,
  useEditSubmittedTemplate,
  useSubmitTemplateDraft,
  useUpdateTemplateDraft,
} from "@/queries/useTemplates";
import type {
  TemplateCategory,
  TemplateComponent,
  TemplateData,
} from "@/supabase/client";
import {
  buildTemplateDraftInput,
  getTemplateContentErrors,
  getTemplateDetailsErrors,
  getTemplateEditorAccess,
  getInitialTemplateEditorStep,
  getTemplateVariableIndexes,
  removeTemplateBodyVariable,
  type TemplateEditorStep,
  type TemplateEditorValues,
} from "@/utils/TemplateDraftUtils";
import { formatPhoneNumber } from "@/utils/FormatUtils";

export default function TemplateEditor({
  existingTemplate,
  organizationAddress,
  submittedEdit = false,
}: {
  existingTemplate?: TemplateRecord;
  organizationAddress: string;
  submittedEdit?: boolean;
}) {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: addresses } = useOrganizationsAddresses();
  const [values, setValues] = useState<TemplateEditorValues>(() =>
    getInitialValues(
      existingTemplate,
      (existingTemplate?.components || []) as unknown as TemplateComponent[],
      organizationAddress,
    ),
  );
  const [step, setStep] = useState<TemplateEditorStep>(() =>
    getInitialTemplateEditorStep(existingTemplate?.status, submittedEdit),
  );
  const [savedDraftId, setSavedDraftId] = useState(
    existingTemplate?.status === "draft" ? existingTemplate.id : undefined,
  );
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const createDraft = useCreateTemplateDraft();
  const updateDraft = useUpdateTemplateDraft();
  const submitDraft = useSubmitTemplateDraft();
  const editSubmittedTemplate = useEditSubmittedTemplate();
  const { isReadOnly, lockIdentity } = getTemplateEditorAccess(
    existingTemplate?.status,
    submittedEdit,
  );
  const isPending =
    createDraft.isPending ||
    updateDraft.isPending ||
    submitDraft.isPending ||
    editSubmittedTemplate.isPending;
  const detailsErrors = getTemplateDetailsErrors(values);
  const contentErrors = getTemplateContentErrors(values);
  const readinessErrors = [...detailsErrors, ...contentErrors];
  const bodyIndexes = useMemo(
    () => getTemplateVariableIndexes(values.body),
    [values.body],
  );
  const whatsappAccounts =
    addresses?.filter((item) => item.service === "whatsapp") || [];
  const previewTemplate: TemplateData = {
    id: existingTemplate?.external_id || existingTemplate?.id || "preview",
    name: values.name || "template_preview",
    language: values.language || "en",
    category: values.category,
    status: "PENDING",
    components: buildTemplateDraftInput(values).components,
  };

  useEffect(() => {
    setValues((current) => {
      if (current.bodySamples.length === bodyIndexes.length) return current;
      return {
        ...current,
        bodySamples: bodyIndexes.map(
          (_, index) => current.bodySamples[index] || "",
        ),
      };
    });
  }, [bodyIndexes]);

  const update = <K extends keyof TemplateEditorValues>(
    key: K,
    value: TemplateEditorValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const persistDraft = async () => {
    const template = buildTemplateDraftInput(values);
    if (savedDraftId) {
      await updateDraft.mutateAsync({
        draftId: savedDraftId,
        organizationAddress: values.organizationAddress,
        template,
      });
      return savedDraftId;
    }
    const draft = await createDraft.mutateAsync({
      organizationAddress: values.organizationAddress,
      template,
    });
    setSavedDraftId(draft.id);
    return draft.id;
  };

  const returnToList = () =>
    void navigate({
      to: "/templates",
    });

  const saveDraft = async () => {
    if (detailsErrors.length) return;
    try {
      await persistDraft();
      void message.success(t("Borrador guardado"));
      returnToList();
    } catch {
      void message.error(t("No se pudo guardar el borrador"));
    }
  };

  const submit = async () => {
    if (readinessErrors.length) return;
    try {
      const draftId = await persistDraft();
      await submitDraft.mutateAsync({
        draftId,
        organizationAddress: values.organizationAddress,
        template: buildTemplateDraftInput(values),
      });
      void message.success(t("Plantilla enviada a Meta"));
      returnToList();
    } catch {
      void message.error(
        t("El borrador se guardó, pero no se pudo enviar a Meta"),
      );
    }
  };

  const saveSubmittedChanges = async () => {
    if (!existingTemplate || readinessErrors.length) return;
    try {
      const result = await editSubmittedTemplate.mutateAsync({
        templateId: existingTemplate.id,
        template: buildTemplateDraftInput(values),
      });
      if (result.sync_pending) {
        void message.warning(
          t(
            "Los cambios se guardaron en Meta, pero la sincronización sigue pendiente.",
          ),
        );
      } else {
        void message.success(t("Cambios guardados en Meta"));
      }
      returnToList();
    } catch {
      void message.error(t("No se pudieron guardar los cambios en Meta"));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="border-b border-border px-[18px] py-[18px] md:px-[28px]">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex items-center justify-between gap-[16px]">
            <div className="flex items-center gap-[12px]">
              <button
                type="button"
                className="rounded-lg p-[7px] hover:bg-muted"
                onClick={returnToList}
                aria-label={t("Volver")}
              >
                <ArrowLeft className="h-[20px] w-[20px]" />
              </button>
              <div>
                <h1 className="text-[22px] font-semibold">
                  {isReadOnly
                    ? t("Detalles de plantilla")
                    : submittedEdit
                      ? t("Editar plantilla")
                      : existingTemplate
                        ? t("Continuar plantilla")
                        : t("Crear plantilla")}
                </h1>
                <p className="mt-[2px] text-[12px] text-muted-foreground">
                  {isReadOnly
                    ? t("Esta plantilla ya fue enviada a Meta.")
                    : submittedEdit
                      ? t(
                          "Editá la categoría y el contenido; la cuenta, el nombre y el idioma no cambian.",
                        )
                      : t("Prepará el contenido antes de enviarlo a Meta.")}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="text-[13px] text-muted-foreground hover:text-foreground"
              onClick={returnToList}
            >
              {t("Volver a plantillas")}
            </button>
          </div>
          <Progress step={step} readOnly={isReadOnly} />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-[16px] py-[20px] md:px-[28px]">
        <div className="mx-auto grid max-w-[1500px] gap-[20px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <main className="min-w-0">
            {step === 1 && (
              <DetailsStep
                values={values}
                update={update}
                accounts={whatsappAccounts}
                readOnly={isReadOnly}
                lockIdentity={lockIdentity}
              />
            )}
            {step === 2 && (
              <ContentStep
                values={values}
                update={update}
                bodyIndexes={bodyIndexes}
                bodyRef={bodyRef}
                readOnly={isReadOnly}
              />
            )}
            {step === 3 && (
              <ReviewStep
                values={values}
                accountLabel={getAccountLabel(
                  values.organizationAddress,
                  whatsappAccounts.find(
                    (item) => item.address === values.organizationAddress,
                  )?.extra,
                )}
                status={existingTemplate?.status}
              />
            )}
          </main>

          <aside className="space-y-[16px] xl:sticky xl:top-0 xl:self-start">
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-[16px] py-[13px] font-medium">
                {t("Vista previa de WhatsApp")}
              </div>
              <div className="min-h-[260px] bg-chat py-[18px] [&>div]:!mx-[12px] [&>div>div>div]:!max-w-[92%]">
                <TemplatePreview editMode template={previewTemplate} />
              </div>
            </section>
            <section className="rounded-xl border border-border bg-card p-[16px]">
              <div className="flex items-center gap-[8px] font-medium">
                {readinessErrors.length ? (
                  <CircleAlert className="h-[18px] w-[18px] text-amber-500" />
                ) : (
                  <CheckCircle2 className="h-[18px] w-[18px] text-green-500" />
                )}
                {t("Preparación")}
              </div>
              {readinessErrors.length ? (
                <ul className="mt-[12px] space-y-[7px] text-[12px] text-muted-foreground">
                  {readinessErrors.slice(0, 4).map((error) => (
                    <li key={error} className="flex gap-[7px]">
                      <span>•</span>
                      <span>{t(error)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-[9px] text-[12px] text-green-500">
                  {t("Lista para enviar a Meta.")}
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>

      <footer className="border-t border-border bg-background px-[16px] py-[14px] md:px-[28px]">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-end gap-[10px]">
          {isReadOnly ? (
            <button
              type="button"
              className="primary px-[18px] py-[10px]"
              onClick={returnToList}
            >
              {t("Volver a plantillas")}
            </button>
          ) : (
            <>
              {!submittedEdit && (
                <button
                  type="button"
                  className="mr-auto rounded-lg border border-border px-[17px] py-[10px] text-[13px] hover:bg-muted disabled:opacity-50"
                  disabled={isPending || detailsErrors.length > 0}
                  onClick={() => void saveDraft()}
                >
                  {t("Guardar borrador")}
                </button>
              )}
              {step > 1 && (
                <button
                  type="button"
                  className="rounded-lg border border-border px-[17px] py-[10px] text-[13px] hover:bg-muted"
                  disabled={isPending}
                  onClick={() => setStep((step - 1) as TemplateEditorStep)}
                >
                  {t("Atrás")}
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  className="primary flex items-center gap-[7px] px-[18px] py-[10px] disabled:opacity-50"
                  disabled={
                    isPending ||
                    (step === 1
                      ? detailsErrors.length > 0
                      : readinessErrors.length > 0)
                  }
                  onClick={() => setStep((step + 1) as TemplateEditorStep)}
                >
                  {t("Continuar")}
                  <ChevronRight className="h-[16px] w-[16px]" />
                </button>
              ) : (
                <button
                  type="button"
                  className="primary px-[18px] py-[10px] disabled:opacity-50"
                  disabled={isPending || readinessErrors.length > 0}
                  onClick={() =>
                    void (submittedEdit ? saveSubmittedChanges() : submit())
                  }
                >
                  {isPending
                    ? t("Guardando...")
                    : submittedEdit
                      ? t("Guardar cambios en Meta")
                      : t("Enviar a Meta")}
                </button>
              )}
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

function Progress({
  step,
  readOnly,
}: {
  step: TemplateEditorStep;
  readOnly: boolean;
}) {
  const { translate: t } = useTranslation();
  const items = [t("Detalles"), t("Contenido"), t("Revisión")];
  return (
    <div className="mx-auto mt-[20px] flex max-w-[760px] items-center">
      {items.map((label, index) => {
        const number = (index + 1) as TemplateEditorStep;
        const complete = readOnly || number < step;
        const active = readOnly ? number === 3 : number === step;
        return (
          <div
            key={label}
            className={`flex items-center ${index < items.length - 1 ? "flex-1" : ""}`}
          >
            <div className="flex items-center gap-[8px]">
              <span
                className={`flex h-[30px] w-[30px] items-center justify-center rounded-full border text-[12px] ${complete ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              >
                {complete ? <Check className="h-[15px] w-[15px]" /> : number}
              </span>
              <span
                className={`hidden text-[12px] sm:inline ${active ? "text-foreground" : "text-muted-foreground"}`}
              >
                {label}
              </span>
            </div>
            {index < items.length - 1 && (
              <div
                className={`mx-[12px] h-px flex-1 ${number < step || readOnly ? "bg-primary" : "bg-border"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DetailsStep({
  values,
  update,
  accounts,
  readOnly,
  lockIdentity,
}: StepProps & {
  accounts: Array<{ address: string; extra: unknown }>;
  lockIdentity: boolean;
}) {
  const { translate: t } = useTranslation();
  return (
    <section className="rounded-xl border border-border bg-card p-[18px] md:p-[24px]">
      <h2 className="text-[18px] font-semibold">
        {t("Detalles de plantilla")}
      </h2>
      <p className="mt-[4px] text-[13px] text-muted-foreground">
        {t("Elegí la cuenta, la categoría y el nombre interno de Meta.")}
      </p>
      <div className="mt-[22px] grid gap-[18px] md:grid-cols-2">
        <Field label={t("Cuenta de WhatsApp")}>
          <CampaignFilterSelect
            ariaLabel={t("Cuenta de WhatsApp")}
            value={values.organizationAddress}
            disabled={readOnly || lockIdentity}
            onChange={(value) => update("organizationAddress", value)}
            options={accounts.map((item) => ({
              value: item.address,
              label: getAccountLabel(item.address, item.extra),
            }))}
          />
        </Field>
        <Field label={t("Categoría")}>
          <CampaignFilterSelect
            ariaLabel={t("Categoría")}
            value={values.category}
            disabled={readOnly}
            onChange={(value) => update("category", value as TemplateCategory)}
            options={[
              { value: "UTILITY", label: t("Utilidad") },
              { value: "MARKETING", label: t("Marketing") },
              { value: "AUTHENTICATION", label: t("Autenticación") },
            ]}
          />
        </Field>
        <Field label={t("Idioma")}>
          <CampaignFilterSelect
            ariaLabel={t("Idioma")}
            value={values.language}
            disabled={readOnly || lockIdentity}
            onChange={(value) => update("language", value)}
            options={[
              { value: "en", label: "English" },
              { value: "es", label: "Español" },
              { value: "pt_BR", label: "Português (Brasil)" },
            ]}
          />
        </Field>
        <Field
          label={t("Nombre de plantilla")}
          hint={t("Minúsculas, números y guiones bajos.")}
        >
          <input
            className="template-input"
            value={values.name}
            disabled={readOnly || lockIdentity}
            maxLength={512}
            placeholder="order_update"
            onChange={(event) =>
              update(
                "name",
                event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
              )
            }
          />
        </Field>
      </div>
    </section>
  );
}

type StepProps = {
  values: TemplateEditorValues;
  update: <K extends keyof TemplateEditorValues>(
    key: K,
    value: TemplateEditorValues[K],
  ) => void;
  readOnly: boolean;
};

function ContentStep({
  values,
  update,
  bodyIndexes,
  bodyRef,
  readOnly,
}: StepProps & {
  bodyIndexes: number[];
  bodyRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const { translate: t } = useTranslation();
  const appendBodyVariable = () => {
    const next = bodyIndexes.length + 1;
    const suffix = values.body && !values.body.endsWith(" ") ? " " : "";
    update("body", `${values.body}${suffix}{{${next}}}`);
    requestAnimationFrame(() => bodyRef.current?.focus());
  };
  const removeHeaderVariable = () => {
    const result = removeTemplateBodyVariable(
      values.header,
      [values.headerSample],
      1,
    );
    update("header", result.body);
    update("headerSample", "");
  };
  const removeBodyVariable = (variableIndex: number) => {
    const result = removeTemplateBodyVariable(
      values.body,
      values.bodySamples,
      variableIndex,
    );
    update("body", result.body);
    update("bodySamples", result.bodySamples);
    requestAnimationFrame(() => bodyRef.current?.focus());
  };
  return (
    <div className="space-y-[16px]">
      <section className="rounded-xl border border-border bg-card p-[18px] md:p-[24px]">
        <h2 className="text-[18px] font-semibold">
          {t("Contenido del mensaje")}
        </h2>
        <p className="mt-[4px] text-[13px] text-muted-foreground">
          {t("Creá el mensaje y agregá ejemplos para cada variable.")}
        </p>
        <div className="mt-[22px] space-y-[18px]">
          <Field
            label={`${t("Encabezado")} (${t("opcional")})`}
            hint={`${values.header.length}/60`}
          >
            <div className="flex gap-[8px]">
              <input
                className="template-input"
                value={values.header}
                disabled={readOnly}
                maxLength={60}
                placeholder={t("Actualización de tu pedido")}
                onChange={(event) => update("header", event.target.value)}
              />
              <button
                type="button"
                className="rounded-lg border border-border px-[11px] text-primary disabled:opacity-40"
                disabled={
                  readOnly || values.header.includes("{{1}}") || !values.header
                }
                onClick={() => update("header", `${values.header} {{1}}`)}
                title={t("Agregar variable")}
              >
                <Plus className="h-[16px] w-[16px]" />
              </button>
            </div>
          </Field>
          {values.header.includes("{{1}}") && (
            <Field label={`${t("Ejemplo para")} {{1}}`}>
              <div className="flex gap-[8px]">
                <input
                  className="template-input"
                  value={values.headerSample}
                  disabled={readOnly}
                  placeholder={t("Pedido #1234")}
                  onChange={(event) =>
                    update("headerSample", event.target.value)
                  }
                />
                {!readOnly && (
                  <button
                    type="button"
                    className="rounded-lg border border-border px-[10px] text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                    onClick={removeHeaderVariable}
                    aria-label={t("Eliminar variable")}
                    title={t("Eliminar variable")}
                  >
                    <Trash2 className="h-[15px] w-[15px]" />
                  </button>
                )}
              </div>
            </Field>
          )}
          <Field label={t("Cuerpo")} hint={`${values.body.length}/1024`}>
            <textarea
              ref={bodyRef}
              className="template-input min-h-[160px] resize-y py-[11px]"
              value={values.body}
              disabled={readOnly}
              maxLength={1024}
              placeholder={t("Hola {{1}}, tu pedido está listo.")}
              onChange={(event) => update("body", event.target.value)}
            />
            <button
              type="button"
              className="mt-[7px] flex items-center gap-[5px] text-[12px] text-primary disabled:opacity-40"
              disabled={readOnly}
              onClick={appendBodyVariable}
            >
              <Plus className="h-[14px] w-[14px]" />
              {t("Agregar variable")}
            </button>
          </Field>
          {bodyIndexes.map((variable, index) => (
            <Field
              key={variable}
              label={`${t("Ejemplo para")} {{${variable}}}`}
            >
              <div className="flex gap-[8px]">
                <input
                  className="template-input"
                  value={values.bodySamples[index] || ""}
                  disabled={readOnly}
                  placeholder={t("Ejemplo: Juan, #1234...")}
                  onChange={(event) => {
                    const samples = [...values.bodySamples];
                    samples[index] = event.target.value;
                    update("bodySamples", samples);
                  }}
                />
                {!readOnly && (
                  <button
                    type="button"
                    className="rounded-lg border border-border px-[10px] text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                    onClick={() => removeBodyVariable(variable)}
                    aria-label={`${t("Eliminar variable")} {{${variable}}}`}
                    title={t("Eliminar variable")}
                  >
                    <Trash2 className="h-[15px] w-[15px]" />
                  </button>
                )}
              </div>
            </Field>
          ))}
          <Field
            label={`${t("Pie")} (${t("opcional")})`}
            hint={`${values.footer.length}/60`}
          >
            <input
              className="template-input"
              value={values.footer}
              disabled={readOnly}
              maxLength={60}
              placeholder={t("Respondé si necesitás ayuda")}
              onChange={(event) => update("footer", event.target.value)}
            />
          </Field>
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-[18px] md:p-[24px]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold">
              {t("Respuestas rápidas")}
            </h2>
            <p className="mt-[3px] text-[12px] text-muted-foreground">
              {t("Agregá hasta tres botones opcionales.")}
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-[5px] text-[12px] text-primary disabled:opacity-40"
            disabled={readOnly || values.quickReplies.length >= 3}
            onClick={() => update("quickReplies", [...values.quickReplies, ""])}
          >
            <Plus className="h-[14px] w-[14px]" />
            {t("Agregar")}
          </button>
        </div>
        <div className="mt-[14px] space-y-[9px]">
          {values.quickReplies.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-[18px] text-center text-[12px] text-muted-foreground">
              {t("No hay botones agregados.")}
            </div>
          )}
          {values.quickReplies.map((reply, index) => (
            <div key={index} className="flex gap-[8px]">
              <input
                className="template-input"
                value={reply}
                disabled={readOnly}
                maxLength={25}
                placeholder={t("Confirmar")}
                onChange={(event) => {
                  const replies = [...values.quickReplies];
                  replies[index] = event.target.value;
                  update("quickReplies", replies);
                }}
              />
              <button
                type="button"
                className="rounded-lg border border-border px-[10px] text-muted-foreground hover:text-destructive"
                disabled={readOnly}
                onClick={() =>
                  update(
                    "quickReplies",
                    values.quickReplies.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  )
                }
              >
                <X className="h-[15px] w-[15px]" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReviewStep({
  values,
  accountLabel,
  status,
}: {
  values: TemplateEditorValues;
  accountLabel: string;
  status?: string;
}) {
  const { translate: t } = useTranslation();
  return (
    <section className="rounded-xl border border-border bg-card p-[18px] md:p-[24px]">
      <div className="flex items-start justify-between gap-[12px]">
        <div>
          <h2 className="text-[18px] font-semibold">
            {t("Revisar plantilla")}
          </h2>
          <p className="mt-[4px] text-[13px] text-muted-foreground">
            {t("Confirmá los detalles antes de enviar a Meta.")}
          </p>
        </div>
        {status && (
          <span className="rounded-full bg-muted px-[9px] py-[4px] text-[11px] capitalize text-muted-foreground">
            {status.replaceAll("_", " ")}
          </span>
        )}
      </div>
      <dl className="mt-[22px] grid gap-[16px] rounded-xl border border-border p-[18px] sm:grid-cols-2">
        <Summary label={t("Nombre")} value={values.name} />
        <Summary label={t("Cuenta")} value={accountLabel} />
        <Summary label={t("Categoría")} value={values.category.toLowerCase()} />
        <Summary label={t("Idioma")} value={values.language} />
        <Summary
          label={t("Variables")}
          value={String(
            getTemplateVariableIndexes(values.header).length +
              getTemplateVariableIndexes(values.body).length,
          )}
        />
        <Summary
          label={t("Respuestas rápidas")}
          value={String(values.quickReplies.length)}
        />
      </dl>
      <div className="mt-[18px] rounded-lg border border-primary/30 bg-primary/5 p-[14px] text-[12px] text-muted-foreground">
        {t(
          "Al enviar, Meta revisará la plantilla. El estado se mostrará en el Template Manager.",
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-[7px] flex items-center justify-between gap-[8px] text-[12px] font-medium">
        <span>{label}</span>
        {hint && (
          <span className="font-normal text-muted-foreground">{hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-[5px] break-words text-[13px] font-medium capitalize">
        {value || "—"}
      </dd>
    </div>
  );
}

function getInitialValues(
  existingTemplate: TemplateRecord | undefined,
  components: TemplateComponent[],
  organizationAddress: string,
): TemplateEditorValues {
  const header = components.find((component) => component.type === "HEADER");
  const body = components.find((component) => component.type === "BODY");
  const footer = components.find((component) => component.type === "FOOTER");
  const buttons = components.find((component) => component.type === "BUTTONS");
  return {
    organizationAddress:
      existingTemplate?.organization_address || organizationAddress,
    name: existingTemplate?.name || "",
    language: existingTemplate?.language || "en",
    category:
      (existingTemplate?.category?.toUpperCase() as TemplateCategory) ||
      "UTILITY",
    header: header?.text || "",
    headerSample: header?.example?.header_text?.[0] || "",
    body: body?.text || "",
    bodySamples: body?.example?.body_text?.[0] || [],
    footer: footer?.text || "",
    quickReplies: buttons?.buttons.map((button) => button.text) || [],
  };
}

function getAccountLabel(address: string, extra: unknown) {
  const details =
    extra && typeof extra === "object" && !Array.isArray(extra)
      ? (extra as Record<string, unknown>)
      : {};
  const name =
    typeof details.verified_name === "string" ? details.verified_name : "";
  const rawPhone =
    typeof details.phone_number === "string" ? details.phone_number : address;
  const phone = formatPhoneNumber(rawPhone);
  return name ? `${name} · ${phone}` : phone;
}
