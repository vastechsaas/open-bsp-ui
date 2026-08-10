import {
  Building2,
  ContactRound,
  Instagram,
  MessageSquareText,
  Search,
  UsersRound,
} from "lucide-react";
import { WhatsAppOutlined } from "@ant-design/icons";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import DataTablePagination from "@/components/DataTablePagination";
import Spinner from "@/components/Spinner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/hooks/useTranslation";
import {
  usePlatformAccessAudit,
  usePlatformOrganizations,
  usePlatformOverview,
} from "@/queries/usePlatformAdmin";
import { DEFAULT_DATA_TABLE_PAGE_SIZE } from "@/utils/DataTableUtils";
import { formatPlatformMetric } from "@/utils/PlatformAdminUtils";
import PlatformMetricCard from "./PlatformMetricCard";

export default function PlatformOverview() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_DATA_TABLE_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search.trim());
  const overview = usePlatformOverview();
  const organizations = usePlatformOrganizations({
    page,
    pageSize,
    search: debouncedSearch || undefined,
  });

  usePlatformAccessAudit(
    "global",
    null,
    overview.isSuccess && organizations.isSuccess,
  );

  useEffect(() => setPage(1), [debouncedSearch]);

  const metrics = overview.data;
  const rows = organizations.data?.rows || [];
  const total = organizations.data?.total || 0;

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 p-4 sm:p-6 lg:p-7">
      <header>
        <h1 className="text-[26px] font-semibold tracking-tight">
          {t("Vista general de la plataforma")}
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {t("Supervisá el estado operativo de todos los tenants.")}
        </p>
      </header>

      {overview.isPending ? (
        <div className="flex min-h-[220px] items-center justify-center">
          <Spinner size={30} className="text-primary" />
        </div>
      ) : overview.isError || !metrics ? (
        <PlatformError message={t("No se pudo cargar la vista general.")} />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <PlatformMetricCard
            icon={<Building2 />}
            label={t("Tenants")}
            value={metrics.organization_count}
          />
          <PlatformMetricCard
            icon={<UsersRound />}
            label={t("Miembros humanos")}
            value={metrics.human_member_count}
            caption={t("Invitaciones aceptadas")}
          />
          <PlatformMetricCard
            icon={<ContactRound />}
            label={t("Contactos activos")}
            value={metrics.active_contact_count}
          />
          <PlatformMetricCard
            icon={<MessageSquareText />}
            label={t("Conversaciones activas")}
            value={metrics.active_conversation_count}
          />
          <PlatformMetricCard
            icon={<WhatsAppOutlined />}
            label="WhatsApp"
            value={metrics.connected_whatsapp_account_count}
            caption={t("Cuentas conectadas")}
          />
          <PlatformMetricCard
            icon={<Instagram />}
            label="Instagram"
            value={metrics.connected_instagram_account_count}
            caption={t("Cuentas conectadas")}
          />
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[17px] font-semibold">{t("Organizaciones")}</h2>
            <p className="text-[12px] text-muted-foreground">
              {t("Seleccioná un tenant para ver su resumen operativo.")}
            </p>
          </div>
          <label className="flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 sm:ml-auto sm:w-[360px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("Buscar por nombre o ID")}
              className="min-w-0 flex-1 border-none bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>

        {organizations.isPending ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <Spinner />
          </div>
        ) : organizations.isError ? (
          <PlatformError message={t("No se pudieron cargar los tenants.")} />
        ) : rows.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center p-6 text-center">
            <Building2 className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">{t("No se encontraron tenants")}</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("Tenant")}</th>
                    <th className="px-4 py-3">{t("Plan")}</th>
                    <th className="px-4 py-3">{t("Miembros")}</th>
                    <th className="px-4 py-3">{t("Contactos")}</th>
                    <th className="px-4 py-3">{t("Conversaciones")}</th>
                    <th className="px-4 py-3">WhatsApp</th>
                    <th className="px-4 py-3">Instagram</th>
                    <th className="px-4 py-3">{t("Actualizado")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((organization) => (
                    <tr
                      key={organization.organization_id}
                      tabIndex={0}
                      className="cursor-pointer text-[13px] hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                      onClick={() =>
                        void navigate({
                          to: "/platform/$organizationId",
                          params: {
                            organizationId: organization.organization_id,
                          },
                        })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.click();
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {organization.organization_name}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {organization.organization_id}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {organization.tier_name ||
                          organization.plan_id ||
                          t("Sin plan")}
                      </td>
                      <td className="px-4 py-3">
                        {formatPlatformMetric(organization.human_member_count)}
                      </td>
                      <td className="px-4 py-3">
                        {formatPlatformMetric(
                          organization.active_contact_count,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {formatPlatformMetric(
                          organization.active_conversation_count,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {formatPlatformMetric(
                          organization.connected_whatsapp_account_count,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {formatPlatformMetric(
                          organization.connected_instagram_account_count,
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                        }).format(
                          new Date(organization.organization_updated_at),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border lg:hidden">
              {rows.map((organization) => (
                <button
                  key={organization.organization_id}
                  type="button"
                  className="flex w-full flex-col gap-2 p-4 text-left hover:bg-muted/50"
                  onClick={() =>
                    void navigate({
                      to: "/platform/$organizationId",
                      params: {
                        organizationId: organization.organization_id,
                      },
                    })
                  }
                >
                  <span className="font-medium">
                    {organization.organization_name}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    {t("Contactos")}: {organization.active_contact_count} ·{" "}
                    {t("Conversaciones")}:{" "}
                    {organization.active_conversation_count}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex flex-col justify-between gap-3 border-t border-border px-4 py-3 text-[12px] text-muted-foreground sm:flex-row sm:items-center">
          <span>
            {formatPlatformMetric(total)} {t("tenants")}
          </span>
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            disabled={organizations.isFetching}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        </div>
      </section>
    </div>
  );
}

function PlatformError({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center p-6 text-center text-[14px] text-destructive">
      {message}
    </div>
  );
}
