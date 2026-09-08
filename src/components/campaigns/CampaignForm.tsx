import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { message } from "antd";
import { FileText, FileUp, ImageIcon, Users, Video } from "lucide-react";
import Button from "@/components/Button";
import FieldError from "@/components/FieldError";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import SelectField from "@/components/SelectField";
import TemplatePreview from "@/components/TemplatePreview";
import { useTranslation } from "@/hooks/useTranslation";
import { useContacts } from "@/queries/useContacts";
import {
  type CampaignAudienceType,
  type CampaignDraftInput,
  type CampaignRow,
  useCampaignAudienceCount,
  useCampaignAudiencePreview,
} from "@/queries/useCampaigns";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import { useTemplates } from "@/queries/useTemplates";
import type {
  Json,
  TemplateData,
  WhatsAppOrganizationAddressExtra,
} from "@/supabase/client";
import {
  type CampaignCsvRecipient,
  type CampaignSubmitIntent,
  getTemplateVariables,
  getTemplateMediaHeaderFormat,
  parseCampaignCsv,
} from "@/utils/CampaignUtils";
import { getTemplateMediaFileError } from "@/utils/TemplateDraftUtils";
import type { CampaignHeaderMedia } from "@/queries/useCampaigns";
import { formatPhoneNumber } from "@/utils/FormatUtils";

type CampaignFormValues = {
  name: string;
  organization_address: string;
  template_id: string;
  audience_type: CampaignAudienceType;
};

type CampaignFormProps = {
  campaign?: CampaignRow;
  createdBy?: string;
  layout?: "panel" | "workspace";
  loading: boolean;
  submitLabel: string;
  secondarySubmitLabel?: string;
  onSubmit: (input: CampaignDraftInput, intent: CampaignSubmitIntent) => void;
};

const AUDIENCE_OPTIONS: CampaignAudienceType[] = [
  "all_contacts",
  "active_24h",
  "csv_upload",
];

function asRecord(value: Json): Record<string, string> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

export default function CampaignForm({
  campaign,
  createdBy,
  layout = "panel",
  loading,
  submitLabel,
  secondarySubmitLabel,
  onSubmit,
}: CampaignFormProps) {
  const { translate: t } = useTranslation();
  const isWorkspace = layout === "workspace";
  const storedTemplate = campaign?.template as TemplateData | undefined;
  const [mapping, setMapping] = useState<Record<string, string>>(() =>
    campaign ? asRecord(campaign.template_variable_mapping) : {},
  );
  const [csvRecipients, setCsvRecipients] = useState<CampaignCsvRecipient[]>(
    [],
  );
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvError, setCsvError] = useState<string>();
  const [replaceCsvRecipients, setReplaceCsvRecipients] = useState(false);
  const [externalDirty, setExternalDirty] = useState(false);
  const [submitIntent, setSubmitIntent] =
    useState<CampaignSubmitIntent>("save");
  const [headerMediaFile, setHeaderMediaFile] = useState<File>();
  const [headerMediaPreviewUrl, setHeaderMediaPreviewUrl] = useState<string>();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CampaignFormValues>({
    mode: "onTouched",
    defaultValues: {
      name: campaign?.name || "",
      organization_address: campaign?.organization_address || "",
      template_id: storedTemplate?.id || "",
      audience_type: campaign?.audience_type || "all_contacts",
    },
  });

  useEffect(() => {
    if (!campaign) return;
    setValue("name", campaign.name);
    setValue("organization_address", campaign.organization_address);
    setValue("template_id", storedTemplate?.id || "");
    setValue("audience_type", campaign.audience_type);
    setMapping(asRecord(campaign.template_variable_mapping));
    setExternalDirty(false);
  }, [campaign, setValue, storedTemplate?.id]);

  const organizationAddress = watch("organization_address");
  const templateId = watch("template_id");
  const audienceType = watch("audience_type");
  const { data: addresses } = useOrganizationsAddresses();
  const {
    data: templates,
    isLoading: templatesLoading,
    isError: templatesError,
  } = useTemplates(organizationAddress);
  const { data: contacts } = useContacts();
  const { data: storedAudienceCount } = useCampaignAudienceCount(campaign?.id);
  const { data: storedPreview } = useCampaignAudiencePreview(campaign?.id);

  const approvedTemplates = useMemo(
    () => templates?.filter((template) => template.status === "APPROVED") || [],
    [templates],
  );
  const selectedTemplate =
    approvedTemplates.find((template) => template.id === templateId) ||
    (storedTemplate?.id === templateId ? storedTemplate : undefined);
  const templateVariables = getTemplateVariables(selectedTemplate);
  const mediaHeaderFormat = getTemplateMediaHeaderFormat(selectedTemplate);
  const storedHeaderMedia = campaign?.header_media as
    | CampaignHeaderMedia
    | null
    | undefined;
  const storedMediaMatches =
    !!mediaHeaderFormat &&
    storedHeaderMedia?.format === mediaHeaderFormat &&
    !!storedHeaderMedia.media_id;
  const mediaFileError =
    mediaHeaderFormat && !storedMediaMatches
      ? getTemplateMediaFileError(mediaHeaderFormat, headerMediaFile)
      : headerMediaFile
        ? getTemplateMediaFileError(
            mediaHeaderFormat || "NONE",
            headerMediaFile,
          )
        : null;

  useEffect(() => {
    if (!headerMediaFile) {
      setHeaderMediaPreviewUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(headerMediaFile);
    setHeaderMediaPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [headerMediaFile]);

  const localAllContacts = useMemo(
    () =>
      (contacts || []).flatMap((contact) =>
        contact.status === "active"
          ? contact.addresses
              .filter(
                (address) =>
                  address.service === "whatsapp" && address.status === "active",
              )
              .map((address) => ({
                contact_address: address.address,
                name: contact.name,
                variables: {},
              }))
          : [],
      ),
    [contacts],
  );

  const audienceMatchesStored =
    !!campaign &&
    audienceType === campaign.audience_type &&
    organizationAddress === campaign.organization_address &&
    !replaceCsvRecipients;
  const preview = replaceCsvRecipients
    ? csvRecipients.slice(0, 20)
    : audienceMatchesStored
      ? storedPreview || []
      : audienceType === "all_contacts"
        ? localAllContacts.slice(0, 20)
        : [];
  const audienceCount = replaceCsvRecipients
    ? csvRecipients.length
    : audienceMatchesStored
      ? storedAudienceCount
      : audienceType === "all_contacts"
        ? localAllContacts.length
        : undefined;

  const existingCsvColumns = useMemo(
    () =>
      storedPreview?.flatMap((recipient) =>
        Object.keys(asRecord(recipient.variables)),
      ) || [],
    [storedPreview],
  );
  const availableCsvColumns = [
    ...new Set([...csvColumns, ...existingCsvColumns]),
  ];
  const mappingOptions = [
    { value: "contact.name", label: t("Nombre del contacto") },
    { value: "contact.address", label: t("Teléfono del contacto") },
    ...(audienceType === "csv_upload"
      ? availableCsvColumns.map((column) => ({
          value: `csv.${column}`,
          label: `${t("Columna CSV")}: ${column}`,
        }))
      : []),
  ];
  const mappingIsComplete = templateVariables.every((variable) =>
    mappingOptions.some((option) => option.value === mapping[variable.key]),
  );
  const csvIsRequired =
    audienceType === "csv_upload" &&
    (!campaign || campaign.audience_type !== "csv_upload");
  const submitDisabled =
    (!isDirty && !externalDirty && !!campaign) ||
    !organizationAddress ||
    !templateId ||
    !mappingIsComplete ||
    !!mediaFileError ||
    (csvIsRequired && !csvRecipients.length);

  const audienceLabels: Record<CampaignAudienceType, string> = {
    all_contacts: t("Todos los contactos"),
    active_24h: t("Activos en las últimas 24 horas"),
    csv_upload: t("Cargar archivo CSV"),
  };

  async function handleCsvFile(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = parseCampaignCsv(await file.text());
      setCsvRecipients(parsed.recipients);
      setCsvColumns(parsed.variableColumns);
      setCsvError(undefined);
      setReplaceCsvRecipients(true);
      setExternalDirty(true);
    } catch (error) {
      setCsvRecipients([]);
      setCsvColumns([]);
      setReplaceCsvRecipients(false);
      setCsvError(error instanceof Error ? error.message : String(error));
    }
  }

  function submit(values: CampaignFormValues) {
    if (!selectedTemplate) {
      void message.error(t("Seleccioná una plantilla aprobada"));
      return;
    }
    if (!mappingIsComplete) {
      void message.error(t("Completá el mapeo de variables"));
      return;
    }
    if (csvIsRequired && !csvRecipients.length) {
      setCsvError(t("Cargá un archivo CSV con destinatarios"));
      return;
    }

    onSubmit(
      {
        name: values.name.trim(),
        organization_address: values.organization_address,
        service: "whatsapp",
        created_by: campaign?.created_by || createdBy || null,
        template: selectedTemplate as unknown as Json,
        template_variable_mapping: mapping,
        header_media:
          mediaHeaderFormat && storedMediaMatches
            ? (storedHeaderMedia as unknown as Json)
            : null,
        headerMediaFile,
        audience_type: values.audience_type,
        csvRecipients,
        replaceCsvRecipients,
      },
      submitIntent,
    );
  }

  const cardClass = isWorkspace
    ? "rounded-xl border border-border bg-background p-[16px] md:p-[20px] flex flex-col gap-[16px]"
    : "flex flex-col gap-[16px]";

  const form = (
    <form
      id="campaign-form"
      onSubmit={handleSubmit(submit)}
      className={
        isWorkspace
          ? "grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-[16px]"
          : "flex flex-col gap-[16px]"
      }
    >
      <div className="flex flex-col gap-[16px] min-w-0">
        <section className={cardClass}>
          {isWorkspace && (
            <div>
              <h2 className="font-medium">{t("Detalles de la campaña")}</h2>
              <p className="text-[12px] text-muted-foreground mt-[3px]">
                {t("Elegí la cuenta y la plantilla aprobada.")}
              </p>
            </div>
          )}
          <label>
            <div className="label">{t("Nombre de la campaña")}</div>
            <input
              className={`text ${errors.name ? "border-destructive" : ""}`}
              placeholder={t("Ej. Promoción de julio")}
              {...register("name", { required: t("El nombre es obligatorio") })}
            />
            <FieldError error={errors.name} />
          </label>
          <div className={isWorkspace ? "grid md:grid-cols-2 gap-[14px]" : ""}>
            <SelectField
              name="organization_address"
              control={control}
              label={t("Cuenta de WhatsApp")}
              placeholder={t("Seleccionar cuenta")}
              required
              options={(addresses || [])
                .filter(
                  (address) =>
                    address.service === "whatsapp" &&
                    address.status === "connected",
                )
                .map((address) => ({
                  value: address.address,
                  label: formatPhoneNumber(
                    (address.extra as WhatsAppOrganizationAddressExtra | null)
                      ?.phone_number || address.address,
                  ),
                }))}
              onValueChange={() => {
                setValue("template_id", "", { shouldDirty: true });
                setMapping({});
                setHeaderMediaFile(undefined);
              }}
            />
            <div>
              <SelectField
                name="template_id"
                control={control}
                label={t("Plantilla aprobada")}
                placeholder={
                  templatesLoading
                    ? t("Cargando...")
                    : t("Seleccionar plantilla")
                }
                required
                disabled={
                  !organizationAddress || templatesLoading || templatesError
                }
                options={approvedTemplates.map((template) => ({
                  value: template.id,
                  label: `${template.name} · ${template.language}`,
                }))}
                onValueChange={() => {
                  setMapping({});
                  setHeaderMediaFile(undefined);
                  setExternalDirty(true);
                }}
              />
              {organizationAddress && templatesError && (
                <p className="mt-[6px] text-[12px] text-destructive">
                  {t(
                    "No se pudieron cargar las plantillas aprobadas. Vuelve a conectar la cuenta de WhatsApp e intenta de nuevo.",
                  )}
                </p>
              )}
            </div>
          </div>

          {mediaHeaderFormat && (
            <label className="rounded-xl border border-dashed border-input p-[14px]">
              <div className="flex items-center gap-[8px] text-[14px] font-medium">
                {mediaHeaderFormat === "IMAGE" ? (
                  <ImageIcon className="h-[19px] w-[19px] text-primary" />
                ) : mediaHeaderFormat === "VIDEO" ? (
                  <Video className="h-[19px] w-[19px] text-primary" />
                ) : (
                  <FileText className="h-[19px] w-[19px] text-primary" />
                )}
                {t("Archivo multimedia de la campaña")}
              </div>
              <p className="my-[7px] text-[12px] text-muted-foreground">
                {storedMediaMatches && !headerMediaFile
                  ? `${storedHeaderMedia.file_name} · ${t("guardado en Meta")}`
                  : t("Este archivo se enviará a todos los destinatarios.")}
              </p>
              <input
                type="file"
                accept={
                  mediaHeaderFormat === "IMAGE"
                    ? "image/jpeg,image/png,.jpg,.jpeg,.png"
                    : mediaHeaderFormat === "VIDEO"
                      ? "video/mp4,.mp4"
                      : "application/pdf,.pdf"
                }
                className="max-w-full text-[13px]"
                onChange={(event) => {
                  setHeaderMediaFile(event.target.files?.[0]);
                  setExternalDirty(true);
                }}
              />
              {mediaFileError && (
                <div className="mt-[7px] text-[12px] text-destructive">
                  {t(mediaFileError)}
                </div>
              )}
            </label>
          )}
        </section>

        <section className={cardClass}>
          {isWorkspace && (
            <div>
              <h2 className="font-medium">{t("Audiencia")}</h2>
              <p className="text-[12px] text-muted-foreground mt-[3px]">
                {t("Seleccioná quiénes recibirán esta campaña.")}
              </p>
            </div>
          )}
          <fieldset
            className={
              isWorkspace
                ? "grid sm:grid-cols-3 gap-[10px]"
                : "flex flex-col gap-[8px]"
            }
          >
            {!isWorkspace && (
              <legend className="label">{t("Audiencia")}</legend>
            )}
            {AUDIENCE_OPTIONS.map((option) => (
              <label
                key={option}
                className={`flex items-center gap-[10px] rounded-xl border p-[12px] cursor-pointer ${
                  audienceType === option
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <input
                  type="radio"
                  value={option}
                  {...register("audience_type", { required: true })}
                />
                <span className="text-[13px]">{audienceLabels[option]}</span>
              </label>
            ))}
          </fieldset>

          {audienceType === "csv_upload" && (
            <label className="rounded-xl border border-dashed border-input p-[14px]">
              <div className="flex items-center gap-[8px] text-[14px]">
                <FileUp className="w-[20px] h-[20px] text-primary" />
                {t("Cargar destinatarios CSV")}
              </div>
              <div className="text-[12px] text-muted-foreground my-[8px]">
                {t(
                  "Incluí contact_address o phone, name opcional y columnas para variables.",
                )}
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                className="text-[13px] max-w-full"
                onChange={(event) =>
                  void handleCsvFile(event.target.files?.[0])
                }
              />
              {replaceCsvRecipients && (
                <div className="text-[12px] text-primary mt-[8px]">
                  {csvRecipients.length} {t("destinatarios listos")}
                </div>
              )}
              {csvError && (
                <div className="text-[12px] text-destructive mt-[8px]">
                  {csvError}
                </div>
              )}
            </label>
          )}
        </section>

        {templateVariables.length > 0 && (
          <section className={cardClass}>
            <div>
              <h2 className="font-medium">{t("Mapeo de variables")}</h2>
              <p className="text-[12px] text-muted-foreground mt-[3px]">
                {t("Elegí el dato que completa cada variable de la plantilla.")}
              </p>
            </div>
            <div
              className={isWorkspace ? "grid md:grid-cols-2 gap-[12px]" : ""}
            >
              {templateVariables.map((variable) => (
                <label key={variable.key}>
                  <div className="label">
                    {variable.section === "header"
                      ? t("Encabezado")
                      : variable.section === "button"
                        ? t("URL dinámica")
                        : t("Mensaje")}{" "}
                    {`{{${variable.index}}}`}
                  </div>
                  <select
                    value={mapping[variable.key] || ""}
                    onChange={(event) => {
                      setExternalDirty(true);
                      setMapping((current) => ({
                        ...current,
                        [variable.key]: event.target.value,
                      }));
                    }}
                  >
                    <option value="">{t("Seleccionar dato")}</option>
                    {mappingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="flex flex-col gap-[16px] min-w-0">
        {selectedTemplate && (
          <section className={`${cardClass} overflow-hidden`}>
            <h2 className="font-medium">{t("Vista previa de la plantilla")}</h2>
            <div className="rounded-xl bg-chat py-[16px] min-h-[220px]">
              <TemplatePreview
                template={selectedTemplate}
                editMode
                media={
                  mediaHeaderFormat
                    ? {
                        format: mediaHeaderFormat,
                        url: headerMediaPreviewUrl,
                        fileName:
                          headerMediaFile?.name || storedHeaderMedia?.file_name,
                      }
                    : undefined
                }
              />
            </div>
          </section>
        )}

        <section
          className={isWorkspace ? cardClass : "rounded-xl bg-muted p-[14px]"}
        >
          <div className="flex items-center gap-[8px] font-medium text-[14px]">
            <Users className="w-[18px] h-[18px]" />
            {t("Resumen de audiencia")}
          </div>
          <div className="text-[28px] mt-[4px]">
            {audienceCount === undefined ? "—" : audienceCount.toLocaleString()}
          </div>
          <div className="text-[12px] text-muted-foreground">
            {audienceCount === undefined
              ? t("Guardá el borrador para calcular esta audiencia")
              : t("destinatarios")}
          </div>
          {preview.length > 0 && (
            <div className="mt-[12px] border-t border-border pt-[8px]">
              {preview.slice(0, 5).map((recipient) => (
                <div
                  key={recipient.contact_address}
                  className="flex justify-between gap-[8px] py-[4px] text-[12px]"
                >
                  <span className="truncate">
                    {recipient.name || t("Sin nombre")}
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    {recipient.contact_address}
                  </span>
                </div>
              ))}
              {preview.length > 5 && (
                <div className="text-[12px] text-muted-foreground mt-[4px]">
                  +{preview.length - 5} {t("más en la vista previa")}
                </div>
              )}
            </div>
          )}
        </section>
      </aside>
    </form>
  );

  return (
    <>
      {isWorkspace ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-[16px] md:p-[24px] bg-background">
          <div className="max-w-[1400px] mx-auto">{form}</div>
        </div>
      ) : (
        <SectionBody>{form}</SectionBody>
      )}

      <SectionFooter
        className={
          isWorkspace
            ? "border-t border-border bg-background md:flex-row md:justify-end md:gap-[10px] px-[16px] md:px-[32px] py-[14px]"
            : undefined
        }
      >
        {isWorkspace && secondarySubmitLabel && (
          <Button
            form="campaign-form"
            type="submit"
            className="px-[24px] py-[10px] border border-border rounded-lg"
            loading={loading && submitIntent === "save"}
            invalid={submitDisabled}
            onClick={() => setSubmitIntent("save")}
          >
            {secondarySubmitLabel}
          </Button>
        )}
        <Button
          form="campaign-form"
          type="submit"
          className={isWorkspace ? "primary px-[28px] py-[10px]" : "primary"}
          loading={loading && (!isWorkspace || submitIntent === "review")}
          invalid={submitDisabled}
          onClick={() => setSubmitIntent(isWorkspace ? "review" : "save")}
        >
          {submitLabel}
        </Button>
      </SectionFooter>
    </>
  );
}
