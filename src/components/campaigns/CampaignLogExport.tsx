import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { useCurrentAgent } from "@/queries/useAgents";
import { useTranslation } from "@/hooks/useTranslation";
import {
  campaignExportInfo,
  canExportCampaign,
  isPreparingExport,
} from "@/utils/CampaignExportUtils";

export default function CampaignLogExport({
  campaignId,
  status,
}: {
  campaignId: string;
  status: string;
}) {
  const orgId = useBoundStore((s) => s.ui.activeOrgId);
  const userId = useBoundStore((s) => s.ui.user?.id);
  const { data: agent } = useCurrentAgent();
  const accepted =
    !agent?.extra?.invitation || agent.extra.invitation.status === "accepted";
  if (
    !orgId ||
    !userId ||
    agent?.organization_id !== orgId ||
    agent.user_id !== userId ||
    !canExportCampaign(status, agent.extra?.role, accepted)
  )
    return null;
  return (
    <OwnerExport
      key={`${orgId}:${userId}:${campaignId}`}
      orgId={orgId}
      userId={userId}
      campaignId={campaignId}
    />
  );
}

function OwnerExport({
  orgId,
  userId,
  campaignId,
}: {
  orgId: string;
  userId: string;
  campaignId: string;
}) {
  const { translate: t } = useTranslation();
  const client = useQueryClient();
  const key = [orgId, "campaigns", campaignId, "csv-export", userId];
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const pendingRequest = useRef<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const controller = useRef<AbortController | null>(null);
  const frameName = `campaign-export-${campaignId}`;
  useEffect(() => {
    const active = new AbortController();
    controller.current = active;
    return () => {
      active.abort();
      void client.cancelQueries({
        queryKey: [orgId, "campaigns", campaignId, "csv-export", userId],
      });
      client.removeQueries({
        queryKey: [orgId, "campaigns", campaignId, "csv-export", userId],
      });
    };
  }, [orgId, userId, campaignId, client]);
  const query = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const { data } = await supabase
        .rpc("get_campaign_log_export", {
          p_organization_id: orgId,
          p_campaign_id: campaignId,
        })
        .abortSignal(signal)
        .throwOnError();
      return campaignExportInfo(data);
    },
    refetchInterval: (q) => (isPreparingExport(q.state.data) ? 3_000 : false),
    retry: false,
  });
  const job = query.data;
  const preparing = isPreparingExport(job);
  async function act(fresh = false) {
    const signal = controller.current?.signal;
    if (!signal || signal.aborted || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      if (job?.state === "ready" && !fresh) {
        const { data: ticket } = await supabase
          .rpc("issue_campaign_log_download", { p_export_id: job.id })
          .abortSignal(signal)
          .throwOnError();
        if (!ticket || signal.aborted) return;
        // Native attachment download: session JWTs never appear in URLs, and the
        // browser streams the CSV to disk instead of retaining a Blob in JS memory.
        const form = document.createElement("form");
        form.method = "POST";
        form.target = frameName;
        form.action = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-log-export/download`;
        const field = document.createElement("input");
        field.type = "hidden";
        field.name = "ticket";
        field.value = ticket;
        form.append(field);
        document.body.append(form);
        form.submit();
        form.remove();
      } else if (job?.state === "failed" && !fresh) {
        const { data } = await supabase
          .rpc("retry_campaign_log_export", { p_export_id: job.id })
          .abortSignal(signal)
          .throwOnError();
        if (!signal.aborted) client.setQueryData(key, campaignExportInfo(data));
      } else {
        pendingRequest.current ??= crypto.randomUUID();
        const { data } = await supabase
          .rpc("request_campaign_log_export", {
            p_organization_id: orgId,
            p_campaign_id: campaignId,
            p_request_id: pendingRequest.current,
          })
          .abortSignal(signal)
          .throwOnError();
        if (!signal.aborted) {
          client.setQueryData(key, campaignExportInfo(data));
          pendingRequest.current = null;
        }
      }
    } catch {
      if (!signal.aborted) {
        setFailed(true);
        // Reconcile ambiguous starts/retries; never claim preparation succeeded optimistically.
        await query.refetch();
      }
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  return (
    <div className="flex flex-col items-start sm:items-end gap-2 text-xs min-w-0">
      <iframe
        ref={frame}
        name={frameName}
        title={t("Descarga del registro")}
        className="hidden"
      />
      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border border-primary/60 text-foreground hover:bg-primary/10 disabled:opacity-50"
        disabled={busy || preparing || query.isPending || query.isError}
        onClick={() => void act()}
      >
        <Download size={15} aria-hidden="true" />
        {preparing || busy
          ? t("Preparando…")
          : job?.state === "failed" || failed
            ? t("Reintentar")
            : t("Descargar CSV")}
      </button>
      {preparing && (
        <span role="status">
          {job?.processed_count.toLocaleString()} /{" "}
          {job?.row_count.toLocaleString()}
        </span>
      )}
      {(failed || query.isError || job?.state === "failed") && (
        <span role="alert" className="text-destructive">
          {t("No se pudo preparar o descargar el CSV.")}{" "}
          {query.isError && (
            <button
              className="underline"
              type="button"
              onClick={() => void query.refetch()}
            >
              {t("Reintentar")}
            </button>
          )}
        </span>
      )}
      {job && (
        <span className="text-muted-foreground break-words">
          {t("Generado al")}:{" "}
          {new Date(job.snapshot_at).toLocaleString(undefined, {
            timeZone: job.timezone,
          })}{" "}
          · {job.timezone}
        </span>
      )}
      <span className="text-muted-foreground">
        {t("Un estado vacío significa que la entrega no está confirmada.")}
      </span>
      {job?.state === "ready" && (
        <button
          type="button"
          className="underline"
          disabled={busy}
          onClick={() => void act(true)}
        >
          {t("Generar CSV actualizado")}
        </button>
      )}
    </div>
  );
}
