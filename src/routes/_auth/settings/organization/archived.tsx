import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Modal, message as toast } from "antd";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useArchivedOrganizations,
  useRestoreOrganization,
} from "@/queries/useOrganizations";

export const Route = createFileRoute("/_auth/settings/organization/archived")({
  component: ArchivedOrganizations,
});

function ArchivedOrganizations() {
  const { translate: t } = useTranslation();
  const archived = useArchivedOrganizations();
  const restore = useRestoreOrganization();
  const [selected, setSelected] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [reason, setReason] = useState("");

  return (
    <>
      <SectionHeader title={t("Organizaciones archivadas")} />
      <SectionBody>
        <p className="mb-5 text-[13px] text-muted-foreground">
          {t(
            "Los propietarios pueden restaurar sus organizaciones durante los primeros 30 días.",
          )}
        </p>

        {archived.isPending ? (
          <div className="flex min-h-48 items-center justify-center">
            <Spinner size={26} />
          </div>
        ) : archived.isError ? (
          <p className="text-[13px] text-destructive">
            {t("No se pudieron cargar las organizaciones archivadas.")}
          </p>
        ) : archived.data?.length ? (
          <div className="divide-y divide-border rounded-xl border border-border">
            {archived.data.map((organization) => (
              <div
                key={organization.organization_id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-[14px] font-semibold">
                    {organization.organization_name}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t("Archivada")}: {formatDate(organization.archived_at)}
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {organization.archive_reason}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-primary/40 px-3 py-2 text-[12px] font-medium text-primary disabled:opacity-40"
                  disabled={!organization.can_restore}
                  onClick={() => {
                    setReason("");
                    setSelected({
                      id: organization.organization_id,
                      name: organization.organization_name,
                    });
                  }}
                >
                  {organization.can_restore
                    ? t("Restaurar")
                    : t("Contactar al Super Admin")}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border p-5 text-[13px] text-muted-foreground">
            {t("No tenés organizaciones archivadas.")}
          </p>
        )}
      </SectionBody>

      <Modal
        open={!!selected}
        title={t("Restaurar organización")}
        okText={t("Restaurar")}
        okButtonProps={{ disabled: reason.trim().length === 0 }}
        confirmLoading={restore.isPending}
        onCancel={() => setSelected(null)}
        onOk={() => {
          if (!selected) return;
          restore.mutate(
            { id: selected.id, reason },
            {
              onSuccess: () => {
                toast.success(t("Organización restaurada"));
                setSelected(null);
              },
              onError: (error) => toast.error(error.message),
            },
          );
        }}
      >
        <p className="mb-4 text-[13px] text-muted-foreground">
          {selected?.name}
        </p>
        <label className="block">
          <span className="label">{t("Motivo")}</span>
          <textarea
            className="text min-h-24 w-full"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      </Modal>
    </>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
