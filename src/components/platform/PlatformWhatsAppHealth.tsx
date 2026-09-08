import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import DataTablePagination from "@/components/DataTablePagination";
import Spinner from "@/components/Spinner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type PlatformWhatsAppHealthRow,
  runPlatformWhatsAppHealthAction,
  usePlatformWhatsAppHealthPage,
} from "@/queries/usePlatformWhatsAppHealth";
import { queryKeys } from "@/queries/queryKeys";
import { DEFAULT_DATA_TABLE_PAGE_SIZE } from "@/utils/DataTableUtils";
import {
  isWhatsAppHealthCheckStale,
  runWithConcurrency,
  type WhatsAppHealthStatus,
} from "@/utils/PlatformWhatsAppHealthUtils";
import PlatformWhatsAppHealthStatus from "./PlatformWhatsAppHealthStatus";

export default function PlatformWhatsAppHealth({
  organizationId,
}: {
  organizationId: string;
}) {
  const { translate: t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<WhatsAppHealthStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_DATA_TABLE_PAGE_SIZE);
  const [checking, setChecking] = useState<Set<string>>(new Set());
  const autoChecked = useRef(new Set<string>());
  const debouncedSearch = useDebouncedValue(search.trim());
  const health = usePlatformWhatsAppHealthPage(organizationId, {
    page,
    pageSize,
    search: debouncedSearch || undefined,
    status: status || undefined,
  });

  useEffect(() => setPage(1), [debouncedSearch, status]);
  useEffect(() => {
    autoChecked.current.clear();
    setChecking(new Set());
  }, [organizationId]);

  const rows = useMemo(() => health.data?.rows ?? [], [health.data?.rows]);
  const total = health.data?.total ?? 0;

  useEffect(() => {
    const controller = new AbortController();
    const stale = rows.filter((row) => {
      if (
        !isWhatsAppHealthCheckStale(
          row.connection_status,
          row.last_check_attempted_at,
        )
      ) {
        return false;
      }
      const key = `${organizationId}:${row.phone_number_id}:${row.last_check_attempted_at ?? "missing"}`;
      if (autoChecked.current.has(key)) return false;
      autoChecked.current.add(key);
      return true;
    });
    if (stale.length === 0) return () => controller.abort();

    void runWithConcurrency(stale, 3, async (row) => {
      if (controller.signal.aborted) return;
      setChecking((current) => new Set(current).add(row.phone_number_id));
      try {
        await runPlatformWhatsAppHealthAction({
          organizationId,
          phoneNumberId: row.phone_number_id,
          action: "test_connection",
          signal: controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("Automatic WhatsApp health check failed", error);
      } finally {
        setChecking((current) => {
          const next = new Set(current);
          next.delete(row.phone_number_id);
          return next;
        });
      }
      if (!controller.signal.aborted) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.platform.whatsappHealth(organizationId),
        });
      }
    });

    return () => controller.abort();
  }, [organizationId, queryClient, rows]);

  return (
    <div>
      <header>
        <h2 className="text-xl font-semibold">{t("Salud de WABA")}</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {t("Diagnostica las cuentas de WhatsApp de esta organizacion.")}
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3 sm:max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Buscar cuenta de WhatsApp")}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as WhatsAppHealthStatus | "")
          }
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">{t("Todos los estados de salud")}</option>
          <option value="healthy">{t("Saludable")}</option>
          <option value="warning">{t("Advertencia")}</option>
          <option value="disconnected">{t("Desconectado")}</option>
          <option value="unknown">{t("Desconocido")}</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        {health.isPending ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : health.isError ? (
          <State title={t("No se pudo cargar la salud de WABA")} />
        ) : rows.length === 0 ? (
          <State title={t("No se encontraron cuentas de WhatsApp")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("Cuenta")}</th>
                  <th className="px-4 py-3">{t("Telefono")}</th>
                  <th className="px-4 py-3">{t("Salud")}</th>
                  <th className="px-4 py-3">{t("Webhook")}</th>
                  <th className="px-4 py-3">{t("Token")}</th>
                  <th className="px-4 py-3">{t("Calidad")}</th>
                  <th className="px-4 py-3">{t("Ultimo mensaje")}</th>
                  <th className="px-4 py-3">{t("Ultima comprobacion")}</th>
                  <th className="px-4 py-3 text-right">{t("Acciones")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <HealthRow
                    key={row.phone_number_id}
                    row={row}
                    organizationId={organizationId}
                    checking={checking.has(row.phone_number_id)}
                    t={t}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          disabled={health.isFetching}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}

function HealthRow({
  row,
  organizationId,
  checking,
  t,
}: {
  row: PlatformWhatsAppHealthRow;
  organizationId: string;
  checking: boolean;
  t: (value: string) => string;
}) {
  return (
    <tr className="text-[13px]">
      <td className="px-4 py-4">
        <p className="font-semibold">{row.display_name}</p>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          {row.phone_number_id}
        </p>
      </td>
      <td className="px-4 py-4">{row.display_phone || "—"}</td>
      <td className="px-4 py-4">
        <PlatformWhatsAppHealthStatus
          status={row.health_status}
          label={healthLabel(row.health_status, t)}
          checking={checking}
        />
      </td>
      <td className="px-4 py-4">{stateLabel(row.webhook_status, t)}</td>
      <td className="px-4 py-4">{stateLabel(row.token_status, t)}</td>
      <td className="px-4 py-4">{row.quality_rating || "—"}</td>
      <td className="px-4 py-4 text-muted-foreground">
        {formatDate(row.last_message_activity_at)}
      </td>
      <td className="px-4 py-4 text-muted-foreground">
        {formatDate(row.last_check_attempted_at)}
      </td>
      <td className="px-4 py-4 text-right">
        <Link
          to="/platform/$organizationId/waba-health/$phoneNumberId"
          params={{ organizationId, phoneNumberId: row.phone_number_id }}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] font-medium hover:bg-muted"
        >
          {t("Abrir")}
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  );
}

export function healthLabel(status: string, t: (value: string) => string) {
  if (status === "healthy") return t("Saludable");
  if (status === "warning") return t("Advertencia");
  if (status === "disconnected") return t("Desconectado");
  return t("Desconocido");
}

function stateLabel(status: string, t: (value: string) => string) {
  if (status === "subscribed") return t("Suscrito");
  if (status === "unsubscribed") return t("No suscrito");
  if (status === "valid") return t("Valido");
  if (status === "invalid") return t("Invalido");
  if (status === "expired") return t("Expirado");
  if (status === "error") return t("Error");
  return t("Desconocido");
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function State({ title }: { title: string }) {
  return (
    <div className="flex h-64 items-center justify-center p-6 text-center text-sm text-muted-foreground">
      {title}
    </div>
  );
}
