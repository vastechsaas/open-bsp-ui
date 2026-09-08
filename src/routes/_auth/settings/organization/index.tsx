import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionFooter from "@/components/SectionFooter";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useCurrentOrganization,
  useUpdateCurrentOrganization,
  useArchiveCurrentOrganization,
} from "@/queries/useOrganizations";
import { useCurrentAgent } from "@/queries/useAgents";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useMemo, useState } from "react";
import useBoundStore, {
  reset as resetWorkspaceStore,
} from "@/stores/useBoundStore";
import Button from "@/components/Button";
import SelectField from "@/components/SelectField";
import TextAreaField from "@/components/TextAreaField";
import { type OrganizationUpdate } from "@/supabase/client";
import { Modal, message as toast } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { resetAuthorizedCache } from "@/utils/IdbUtils";

export const Route = createFileRoute("/_auth/settings/organization/")({
  beforeLoad: () => {
    const activeOrgId = useBoundStore.getState().ui.activeOrgId;
    if (!activeOrgId) {
      throw redirect({
        to: "/settings/organization/new",
      });
    }
  },
  component: EditOrganization,
});

function EditOrganization() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: org } = useCurrentOrganization();
  const { data: agent } = useCurrentAgent();
  const isOwner = agent?.extra?.role === "owner";
  const setActiveOrg = useBoundStore((state) => state.ui.setActiveOrg);
  const updateOrg = useUpdateCurrentOrganization();
  const archiveOrg = useArchiveCurrentOrganization();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveName, setArchiveName] = useState("");
  const [archiveReason, setArchiveReason] = useState("");

  const normalizedOrg = useMemo(() => {
    if (!org) return undefined;
    return {
      ...org,
      extra: {
        ...org.extra,
        error_messages_direction:
          org.extra?.error_messages_direction || "internal",
      },
    };
  }, [org]);

  const {
    register,
    handleSubmit,
    control,
    formState: { isValid, isDirty },
  } = useForm<OrganizationUpdate>({ values: normalizedOrg });

  return (
    <>
      <SectionHeader title={t("Organización")} hideBackButton />

      <SectionBody>
        <form
          id="org-form"
          onSubmit={handleSubmit((data) => updateOrg.mutate(data))}
        >
          <label>
            <div className="label">{t("Nombre")}</div>
            <input
              className="text"
              placeholder={t("Nombre de la organización")}
              disabled={!isOwner}
              {...register("name", { required: true })}
            />
          </label>

          <label>
            <div className="label">{t("Demora de respuesta (segundos)")}</div>
            <input
              type="number"
              className="text"
              placeholder="3"
              disabled={!isOwner}
              {...register("extra.response_delay_seconds", {
                valueAsNumber: true,
              })}
            />
          </label>

          <TextAreaField
            control={control}
            name="extra.welcome_message"
            label={t("Mensaje de bienvenida")}
            placeholder={t(
              "Hola! Soy un agente virtual. ¿En qué puedo ayudarte?",
            )}
            disabled={!isOwner}
          />

          <SelectField
            control={control}
            name="extra.error_messages_direction"
            label={t("Mensajes de error")}
            options={[
              { value: "internal", label: t("Solo en la UI") },
              { value: "outgoing", label: t("Visible desde WhatsApp") },
            ]}
            disabled={!isOwner}
          />
        </form>

        {isOwner && org && (
          <section className="mt-10 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <h2 className="text-[14px] font-semibold text-destructive">
              {t("Archivar organización")}
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {t(
                "Suspende el acceso y el procesamiento sin borrar mensajes, archivos ni la conexión de Meta. Podrás restaurarla durante 30 días.",
              )}
            </p>
            <button
              type="button"
              className="mt-4 rounded-lg border border-destructive/40 px-3 py-2 text-[12px] font-medium text-destructive hover:bg-destructive/10"
              onClick={() => setArchiveOpen(true)}
            >
              {t("Archivar organización")}
            </button>
          </section>
        )}
      </SectionBody>

      <SectionFooter>
        <Button
          form="org-form"
          type="submit"
          disabled={!isOwner}
          invalid={!isValid || !isDirty}
          loading={updateOrg.isPending}
          disabledReason={t("Requiere permisos de propietario")}
          className="primary"
        >
          {t("Actualizar")}
        </Button>
      </SectionFooter>

      <Modal
        open={archiveOpen}
        title={t("Archivar organización")}
        okText={t("Archivar")}
        okButtonProps={{
          danger: true,
          disabled:
            archiveName !== org?.name || archiveReason.trim().length === 0,
        }}
        confirmLoading={archiveOrg.isPending}
        onCancel={() => setArchiveOpen(false)}
        onOk={() => {
          if (!org) return;
          archiveOrg.mutate(
            { expectedName: archiveName, reason: archiveReason },
            {
              onSuccess: async () => {
                setArchiveOpen(false);
                setActiveOrg(null);
                resetWorkspaceStore();
                queryClient.clear();
                await resetAuthorizedCache();
                toast.success(t("Organización archivada"));
                await navigate({ to: "/settings/organization/archived" });
              },
              onError: (error) => toast.error(error.message),
            },
          );
        }}
      >
        <p className="mb-4 text-[13px] text-muted-foreground">
          {t("Escribí el nombre exacto de la organización y el motivo.")}
        </p>
        <label className="block">
          <span className="label">{t("Nombre de la organización")}</span>
          <input
            className="text w-full"
            value={archiveName}
            onChange={(event) => setArchiveName(event.target.value)}
            placeholder={org?.name}
          />
        </label>
        <label className="mt-4 block">
          <span className="label">{t("Motivo")}</span>
          <textarea
            className="text min-h-24 w-full"
            value={archiveReason}
            onChange={(event) => setArchiveReason(event.target.value)}
          />
        </label>
      </Modal>
    </>
  );
}
