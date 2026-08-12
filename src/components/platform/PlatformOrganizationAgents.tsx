import { useEffect, useState } from "react";
import { Search, ShieldCheck, UserRound } from "lucide-react";
import DataTablePagination from "@/components/DataTablePagination";
import Spinner from "@/components/Spinner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/hooks/useTranslation";
import { usePlatformOrganizationAgentsPage } from "@/queries/usePlatformOrganizationManagement";
import { DEFAULT_DATA_TABLE_PAGE_SIZE } from "@/utils/DataTableUtils";

export default function PlatformOrganizationAgents({
  organizationId,
}: {
  organizationId: string;
}) {
  const { translate: t } = useTranslation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_DATA_TABLE_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search.trim());
  const agents = usePlatformOrganizationAgentsPage(organizationId, {
    page,
    pageSize,
    search: debouncedSearch || undefined,
  });

  useEffect(() => setPage(1), [debouncedSearch]);

  const rows = agents.data?.rows ?? [];
  const total = agents.data?.total ?? 0;

  return (
    <div className="p-5 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-xl font-semibold">{t("Agentes")}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t("Agentes aceptados y sus colas de negocio.")}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground sm:ml-auto">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("Solo lectura")}
        </span>
      </header>

      <label className="mt-5 flex h-10 max-w-md items-center gap-2 rounded-lg border border-input bg-background px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("Buscar agente")}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        {agents.isPending ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : agents.isError ? (
          <State title={t("No se pudieron cargar los agentes")} />
        ) : rows.length === 0 ? (
          <State title={t("No se encontraron agentes aceptados")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("Agente")}</th>
                  <th className="px-4 py-3">{t("Correo electrónico")}</th>
                  <th className="px-4 py-3">{t("Colas")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((agent) => (
                  <tr key={agent.id} className="text-[13px]">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UserRound className="h-4 w-4" />
                        </span>
                        <span className="font-medium">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {agent.email || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {(agent.queue_names ?? []).length === 0 ? (
                          <span className="text-muted-foreground">
                            {t("Sin colas")}
                          </span>
                        ) : (
                          (agent.queue_names ?? []).map((queue) => (
                            <span
                              key={`${agent.id}-${queue}`}
                              className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                            >
                              {queue}
                            </span>
                          ))
                        )}
                      </div>
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
          total={total}
          disabled={agents.isFetching}
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

function State({ title }: { title: string }) {
  return (
    <div className="flex h-64 items-center justify-center p-6 text-center text-sm text-muted-foreground">
      {title}
    </div>
  );
}
