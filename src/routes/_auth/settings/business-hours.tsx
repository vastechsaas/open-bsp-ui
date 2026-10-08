import { createFileRoute } from "@tanstack/react-router";
import { Spin } from "antd";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import { useRoutingQueueOptions } from "@/queries/useRoutingQueues";
import type {
  BusinessHoursSettings,
  BusinessHoursSchedule,
} from "@/supabase/types/extra_types";
import BusinessHoursForm from "@/components/settings/BusinessHoursForm";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import { useCurrentOrganization } from "@/queries/useOrganizations";
import { useSaveBusinessHours } from "@/queries/useBusinessHours";
import useBoundStore from "@/stores/useBoundStore";
import {
  canManageBusinessHours,
  createBusinessHoursDefaults,
  readBusinessHours,
} from "@/utils/BusinessHoursUtils";

export const Route = createFileRoute("/_auth/settings/business-hours")({
  component: BusinessHours,
});

function BusinessHours() {
  const { translate: t } = useTranslation();
  const userId = useBoundStore((state) => state.ui.user?.id);
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const agent = useCurrentAgent();
  const organization = useCurrentOrganization();
  const save = useSaveBusinessHours();
  const queues = useRoutingQueueOptions();
  const [selection, setSelection] = useState({ orgId: "", queueId: "" });
  const queueId = selection.orgId === orgId ? selection.queueId : "";
  const availability = useQuery({
    queryKey: ["business-hours", userId, orgId, queueId],
    enabled:
      !!userId && !!orgId && canManageBusinessHours(agent.data?.extra?.role),
    queryFn: async ({ signal }) => {
      const result = await supabase
        .rpc("get_business_hours_status", {
          p_organization_id: orgId!,
          p_queue_id: queueId || undefined,
        })
        .abortSignal(signal)
        .throwOnError();
      return result.data as {
        open: boolean;
        reason: string;
        available_agents: number;
      };
    },
    refetchInterval: 60_000,
  });
  if (!orgId || !userId)
    return (
      <p className="p-6 text-[13px] text-muted-foreground">
        {t("Selecciona una organización para configurar el horario.")}
      </p>
    );
  if (agent.isPending || organization.isPending)
    return <Spin className="m-auto" />;
  if (agent.isError || organization.isError)
    return (
      <div className="m-auto p-6 text-center">
        <p role="alert" className="text-[13px] text-destructive">
          {t("No se pudo cargar el horario comercial.")}
        </p>
        <button
          type="button"
          className="mt-3 text-sm text-primary underline"
          onClick={() => {
            void agent.refetch();
            void organization.refetch();
          }}
        >
          {t("Reintentar")}
        </button>
      </div>
    );
  if (!canManageBusinessHours(agent.data?.extra?.role))
    return (
      <p className="p-6 text-[13px] text-destructive">
        {t(
          "Solo propietarios y administradores pueden configurar el horario comercial.",
        )}
      </p>
    );
  const org = organization.data;
  // Do not show another organization's previous query data while switching.
  if (!org || org.id !== orgId || agent.data?.organization_id !== orgId)
    return <Spin className="m-auto" />;
  const stored = org.extra?.business_hours;
  const parsed = readBusinessHours(stored);
  if (stored && !parsed)
    return (
      <p role="alert" className="p-6 text-[13px] text-destructive">
        {t("El horario guardado no es válido. Contacta al administrador.")}
      </p>
    );
  const root =
    parsed ||
    createBusinessHoursDefaults(
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    );
  const override = queueId ? root.queue_overrides?.[queueId] : undefined;
  const scheduleOnly = (
    value: BusinessHoursSettings,
  ): BusinessHoursSchedule => ({
    enabled: value.enabled,
    mode: value.mode,
    timezone: value.timezone,
    all_days: value.all_days,
    per_day: value.per_day,
    holidays: value.holidays,
  });
  const persist = async (settings: BusinessHoursSettings) => {
    await save.mutateAsync({ organizationId: orgId, userId, settings });
    await availability.refetch();
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 border-b border-border p-5">
        <p className="text-sm text-muted-foreground">
          {t(
            "Los horarios controlan la asignación y la toma de chats. Las solicitudes quedan en cola; los chats ya atendidos no se cierran.",
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {t(
            "Los responsables pueden atender solicitudes fuera de horario. Las respuestas automáticas no prometen una hora de atención.",
          )}
        </p>
        <label className="block text-sm">
          {t("Horario de equipo")}
          <select
            value={queueId}
            disabled={save.isPending || !parsed}
            onChange={(event) =>
              setSelection({ orgId, queueId: event.target.value })
            }
            className="ml-2 rounded-lg border border-border bg-background p-2 text-foreground"
          >
            <option value="">{t("Horario de la organización")}</option>
            {(queues.data || []).map((queue) => (
              <option key={queue.id} value={queue.id}>
                {queue.name}
              </option>
            ))}
          </select>
        </label>
        {queues.isError && (
          <p role="alert" className="text-sm text-destructive">
            {t("No se pudieron cargar las colas.")}
            <button
              type="button"
              onClick={() => void queues.refetch()}
              className="ml-2 underline"
            >
              {t("Reintentar")}
            </button>
          </p>
        )}
        {availability.data && (
          <p role="status" className="text-sm">
            {t(
              availability.data.reason === "outside_hours"
                ? "Fuera del horario comercial"
                : availability.data.reason === "no_agents"
                  ? "Sin agentes disponibles"
                  : availability.data.reason === "suspended"
                    ? "Organización suspendida"
                    : "Abierto ahora",
            )}
            {" · "}
            {t("Agentes disponibles")}: {availability.data.available_agents}
          </p>
        )}
        {availability.isError && (
          <p role="alert" className="text-sm text-destructive">
            {t("No se pudo comprobar la disponibilidad.")}
            <button
              type="button"
              onClick={() => void availability.refetch()}
              className="ml-2 underline"
            >
              {t("Reintentar")}
            </button>
          </p>
        )}
        {queueId && (
          <div className="flex items-center gap-3 text-sm">
            <span>
              {t(
                override
                  ? "Horario personalizado"
                  : "Usa el horario de la organización",
              )}
            </span>
            <button
              type="button"
              disabled={save.isPending}
              className="text-primary underline"
              onClick={() =>
                void persist({
                  ...root,
                  queue_overrides: {
                    ...root.queue_overrides,
                    [queueId]: override ? null : scheduleOnly(root),
                  },
                }).catch(() => undefined)
              }
            >
              {t(
                override
                  ? "Usar horario de la organización"
                  : "Personalizar horario",
              )}
            </button>
          </div>
        )}
        {save.isError && (
          <p role="alert" className="text-sm text-destructive">
            {t("No se pudo guardar el horario. Inténtalo de nuevo.")}
          </p>
        )}
      </div>
      <BusinessHoursForm
        key={`${userId}:${orgId}:${queueId}:${!!override}`}
        initialValue={queueId ? scheduleOnly(override || root) : root}
        configured={queueId ? !!override : !!parsed}
        queueOverride={!!queueId}
        translate={t}
        onSave={async (settings) => {
          await persist(
            queueId
              ? {
                  ...root,
                  queue_overrides: {
                    ...root.queue_overrides,
                    [queueId]: scheduleOnly(settings),
                  },
                }
              : settings,
          );
        }}
      />
    </div>
  );
}
