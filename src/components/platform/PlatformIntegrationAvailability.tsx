import { useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useTranslation } from "@/hooks/useTranslation";
import {
  usePlatformIntegrationAvailability,
  useSavePlatformIntegrationAvailability,
} from "@/queries/useIntegrationAvailability";
import {
  integrationSaveRows,
  type IntegrationSettings,
} from "@/utils/IntegrationAvailabilityUtils";
import Switch from "@/components/Switch";

export default function PlatformIntegrationAvailability({
  organizationId,
}: {
  organizationId: string;
}) {
  const query = usePlatformIntegrationAvailability(organizationId);
  const { translate: t } = useTranslation();
  if (query.isPending)
    return <p className="p-6">{t("Cargando integraciones…")}</p>;
  if (query.isError || !query.data)
    return (
      <div role="alert" className="space-y-3 p-6">
        <p>{t("No se pudieron cargar las integraciones.")}</p>
        <button className="underline" onClick={() => void query.refetch()}>
          {t("Reintentar")}
        </button>
      </div>
    );
  return (
    <IntegrationForm
      key={`${organizationId}:${query.data.revision}`}
      organizationId={organizationId}
      initial={query.data}
      onReload={() => void query.refetch()}
    />
  );
}

function IntegrationForm({
  organizationId,
  initial,
  onReload,
}: {
  organizationId: string;
  initial: IntegrationSettings;
  onReload: () => void;
}) {
  const { translate: t } = useTranslation();
  const [rows, setRows] = useState(initial.integrations);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const save = useSavePlatformIntegrationAvailability(organizationId);
  const dirty = JSON.stringify(rows) !== JSON.stringify(initial.integrations);
  const disabling = rows.some(
    (row) =>
      !row.enabled &&
      initial.integrations.find((previous) => previous.id === row.id)?.enabled,
  );
  const conflict = (save.error as { code?: string } | null)?.code === "40001";
  const blocker = useBlocker({
    shouldBlockFn: () => dirty || save.isPending,
    enableBeforeUnload: dirty || save.isPending,
    disabled: !dirty && !save.isPending,
    withResolver: true,
  });
  return (
    <section className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <header>
        <h2 className="text-lg font-semibold">{t("Integraciones")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "Elegí qué integraciones puede administrar esta organización. Habilitada no significa conectada ni cambia los permisos del equipo.",
          )}
        </p>
      </header>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-4 p-4"
          >
            <div>
              <label className="font-medium" htmlFor={`integration-${row.id}`}>
                {row.name}
              </label>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Cuentas conectadas")}: {row.connected_count ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                {row.enabled ? t("Habilitada") : t("Deshabilitada")}
              </p>
            </div>
            <Switch
              id={`integration-${row.id}`}
              checked={row.enabled}
              disabled={save.isPending || conflict}
              onCheckedChange={(enabled) => {
                setRows((current) =>
                  current.map((item) =>
                    item.id === row.id ? { ...item, enabled } : item,
                  ),
                );
                setRequestId(crypto.randomUUID());
                save.reset();
              }}
            />
          </div>
        ))}
      </div>
      {disabling && (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-foreground"
        >
          {t(
            "Las conexiones existentes y las solicitudes de configuración ya aceptadas continuarán. Se bloquearán las nuevas conexiones y los cambios de configuración; los mensajes y el historial no se interrumpen.",
          )}
        </p>
      )}
      {save.isError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive"
        >
          {conflict
            ? t("Las integraciones cambiaron. Recargá antes de guardar.")
            : t("No se pudieron guardar las integraciones. Reintentá.")}
          {conflict && (
            <button className="ml-3 underline" onClick={onReload}>
              {t("Recargar")}
            </button>
          )}
        </div>
      )}
      <div className="flex justify-end">
        <button
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={!dirty || save.isPending || conflict}
          onClick={() =>
            save.mutate({
              integrations: integrationSaveRows({
                revision: initial.revision,
                integrations: rows,
              }),
              revision: initial.revision,
              requestId,
            })
          }
        >
          {save.isPending
            ? t("Guardando…")
            : save.isError
              ? t("Reintentar")
              : t("Guardar cambios")}
        </button>
      </div>
      {blocker.status === "blocked" && (
        <div
          role="alertdialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="max-w-md rounded-xl border bg-background p-6">
            <p>{t("Tenés cambios sin guardar. ¿Querés salir?")}</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => blocker.reset()}>{t("Cancelar")}</button>
              <button
                disabled={save.isPending}
                onClick={() => blocker.proceed()}
              >
                {t("Descartar cambios")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
