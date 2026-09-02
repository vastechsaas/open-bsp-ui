import { Link } from "@tanstack/react-router";
import { ExternalLink, Search } from "lucide-react";
import { useEffect, useState } from "react";
import DataTablePagination from "@/components/DataTablePagination";
import Spinner from "@/components/Spinner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type MediaStorageStatus,
  usePlatformMediaStoragePage,
} from "@/queries/useMediaStorage";
import { DEFAULT_DATA_TABLE_PAGE_SIZE } from "@/utils/DataTableUtils";
import {
  formatStorageBytes,
  mediaStorageStatusClasses,
  mediaStorageStatusLabel,
} from "@/utils/MediaStorageUtils";

export default function PlatformMediaStorage() {
  const { translate: t } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MediaStorageStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_DATA_TABLE_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search.trim());
  const storage = usePlatformMediaStoragePage({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    status: status || undefined,
  });

  useEffect(() => setPage(1), [debouncedSearch, status]);
  const rows = storage.data?.rows ?? [];

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 lg:p-7">
      <header>
        <h1 className="text-[26px] font-semibold tracking-tight">
          {t("Administración de almacenamiento")}
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {t("Supervisa el uso de medios y las cuotas de todos los tenants.")}
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3 sm:max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Buscar tenant")}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as MediaStorageStatus | "")
          }
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">{t("Todos los estados")}</option>
          <option value="safe">{t("Seguro")}</option>
          <option value="approaching">{t("Acercándose al límite")}</option>
          <option value="critical">{t("Crítico")}</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        {storage.isPending ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : storage.isError ? (
          <State text={t("No se pudo cargar el almacenamiento.")} />
        ) : rows.length === 0 ? (
          <State text={t("No se encontraron tenants")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("Tenant")}</th>
                  <th className="px-4 py-3">{t("Uso")}</th>
                  <th className="px-4 py-3">{t("Cuota")}</th>
                  <th className="px-4 py-3">{t("Estado")}</th>
                  <th className="px-4 py-3">{t("Archivos")}</th>
                  <th className="px-4 py-3">{t("Última reconciliación")}</th>
                  <th className="px-4 py-3 text-right">{t("Acciones")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.organization_id} className="text-[13px]">
                    <td className="px-4 py-4 font-semibold">
                      {row.organization_name}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium">
                        {formatStorageBytes(Number(row.used_bytes))}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        ({Number(row.usage_percent).toFixed(2)}%)
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {formatStorageBytes(Number(row.quota_bytes))}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${mediaStorageStatusClasses(row.storage_status)}`}
                      >
                        <span className="h-2 w-2 rounded-full bg-current" />
                        {mediaStorageStatusLabel(row.storage_status, t)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {Number(row.object_count).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {row.last_reconciled_at
                        ? new Intl.DateTimeFormat(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(row.last_reconciled_at))
                        : "—"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        to="/platform/$organizationId/storage"
                        params={{ organizationId: row.organization_id }}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] font-medium hover:bg-muted"
                      >
                        {t("Administrar")}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
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
          total={storage.data?.total ?? 0}
          disabled={storage.isFetching}
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

function State({ text }: { text: string }) {
  return (
    <div className="flex h-64 items-center justify-center p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
