import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { message } from "antd";
import { FileUp, Users } from "lucide-react";
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
  getTemplateVariables,
  parseCampaignCsv,
} from "@/utils/CampaignUtils";
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
  loading: boolean;
  submitLabel: string;
  onSubmit: (input: CampaignDraftInput) => void;
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
  loading,
  submitLabel,
  onSubmit,
}: CampaignFormProps) {
  const { translate: t } = useTranslation();
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
  const { data: templates, isLoading: templatesLoading } =
    useTemplates(organizationAddress);
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

    onSubmit({
      name: values.name.trim(),
      organization_address: values.organization_address,
      service: "whatsapp",
      created_by: campaign?.created_by || createdBy || null,
      template: selectedTemplate as unknown as Json,
      template_variable_mapping: mapping,
      audience_type: values.audience_type,
      csvRecipients,
      replaceCsvRecipients,
    });
  }

  return (
    <>
      <SectionBody>
        <form id="campaign-form" onSubmit={handleSubmit(submit)}>
          <label>
            <div className="label">{t("Nombre de la campaña")}</div>
            <input
              className={`text ${errors.name ? "border-destructive" : ""}`}
              placeholder={t("Ej. Promoción de julio")}
              {...register("name", { required: t("El nombre es obligatorio") })}
            />
            <FieldError error={errors.name} />
          </label>

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
            }}
          />

          <SelectField
            name="template_id"
            control={control}
            label={t("Plantilla aprobada")}
            placeholder={
              templatesLoading ? t("Cargando...") : t("Seleccionar plantilla")
            }
            required
            disabled={!organizationAddress || templatesLoading}
            options={approvedTemplates.map((template) => ({
              value: template.id,
              label: `${template.name} · ${template.language}`,
            }))}
            onValueChange={() => setMapping({})}
          />

          <fieldset className="flex flex-col gap-[8px]">
            <legend className="label">{t("Audiencia")}</legend>
            {AUDIENCE_OPTIONS.map((option) => (
              <label
                key={option}
                className="flex items-center gap-[10px] rounded-xl border border-border p-[12px] cursor-pointer"
              >
                <input
                  type="radio"
                  value={option}
                  {...register("audience_type", { required: true })}
                />
                <span className="text-[14px]">{audienceLabels[option]}</span>
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

          {templateVariables.length > 0 && (
            <div className="flex flex-col gap-[12px]">
              <div>
                <div className="text-[14px] font-medium">
                  {t("Mapeo de variables")}
                </div>
                <p>
                  {t(
                    "Elegí el dato que completa cada variable de la plantilla.",
                  )}
                </p>
              </div>
              {templateVariables.map((variable) => (
                <label key={variable.key}>
                  <div className="label">
                    {variable.section === "header"
                      ? t("Encabezado")
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
          )}

          <div className="rounded-xl bg-muted p-[14px]">
            <div className="flex items-center gap-[8px] font-medium text-[14px]">
              <Users className="w-[18px] h-[18px]" />
              {t("Resumen de audiencia")}
            </div>
            <div className="text-[24px] mt-[8px]">{audienceCount ?? "—"}</div>
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
          </div>

          {selectedTemplate && (
            <div className="rounded-xl border border-border py-[12px] overflow-hidden">
              <div className="px-[14px] text-[14px] font-medium mb-[8px]">
                {t("Vista previa de la plantilla")}
              </div>
              <TemplatePreview template={selectedTemplate} editMode />
            </div>
          )}
        </form>
      </SectionBody>

      <SectionFooter>
        <Button
          form="campaign-form"
          type="submit"
          className="primary"
          loading={loading}
          invalid={
            (!isDirty && !externalDirty && !!campaign) ||
            !organizationAddress ||
            !templateId ||
            !mappingIsComplete ||
            (csvIsRequired && !csvRecipients.length)
          }
        >
          {submitLabel}
        </Button>
      </SectionFooter>
    </>
  );
}
