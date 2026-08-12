import { ArrowLeft, Bot, Building2, ListTree, UsersRound } from "lucide-react";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import {
  usePlatformAccessAudit,
  usePlatformTenantSummary,
} from "@/queries/usePlatformAdmin";

export default function PlatformOrganizationDetailLayout({
  organizationId,
}: {
  organizationId: string;
}) {
  const { translate: t } = useTranslation();
  const location = useLocation();
  const tenant = usePlatformTenantSummary(organizationId);

  usePlatformAccessAudit("tenant", organizationId, tenant.isSuccess);

  if (tenant.isPending) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <Spinner size={30} className="text-primary" />
      </div>
    );
  }

  if (tenant.isError || !tenant.data) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-[15px] text-destructive">
          {t("No se pudo cargar el resumen del tenant.")}
        </p>
        <Link
          to="/platform"
          className="rounded-lg border border-border px-4 py-2 text-[13px] hover:bg-muted"
        >
          {t("Volver a todos los tenants")}
        </Link>
      </div>
    );
  }

  const summary = tenant.data;
  const tabs = [
    {
      label: t("Vista general"),
      to: "/platform/$organizationId" as const,
      active:
        location.pathname === `/platform/${organizationId}` ||
        location.pathname === `/platform/${organizationId}/`,
    },
    {
      label: t("Colas"),
      to: "/platform/$organizationId/queues" as const,
      active: location.pathname.endsWith("/queues"),
    },
    {
      label: t("Agentes"),
      to: "/platform/$organizationId/agents" as const,
      active: location.pathname.endsWith("/agents"),
    },
    {
      label: t("Reportes"),
      to: "/platform/$organizationId/reports" as const,
      active: location.pathname.endsWith("/reports"),
    },
  ];

  const wabaConnected = summary.connected_whatsapp_account_count > 0;

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 lg:p-7">
      <Link
        to="/platform"
        className="mb-4 inline-flex items-center gap-2 text-[12px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("Vista general de la plataforma")}
      </Link>

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="self-start overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-[22px] font-semibold tracking-tight">
              {summary.organization_name}
            </h1>
            <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
              {summary.organization_id}
            </p>
            <span
              className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                wabaConnected
                  ? "bg-emerald-500/15 text-emerald-600"
                  : "bg-amber-500/15 text-amber-600"
              }`}
            >
              {wabaConnected
                ? t("WhatsApp conectado")
                : t("Configuración pendiente")}
            </span>
          </div>

          <dl className="space-y-4 p-5 text-[12px]">
            <Detail
              label={t("Plan")}
              value={summary.tier_name || summary.plan_id || t("Sin plan")}
            />
            <Detail
              label={t("Creado")}
              value={new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
              }).format(new Date(summary.organization_created_at))}
            />
            <Detail
              label={t("Agentes")}
              value={String(summary.accepted_agent_count)}
              icon={<Bot />}
            />
            <Detail
              label={t("Miembros humanos")}
              value={String(summary.human_member_count)}
              icon={<UsersRound />}
            />
            <Detail
              label={t("WhatsApp")}
              value={String(summary.connected_whatsapp_account_count)}
              icon={<ListTree />}
            />
          </dl>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <nav
            className="flex overflow-x-auto border-b border-border px-4"
            aria-label={t("Detalles de la organización")}
          >
            {tabs.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                params={{ organizationId }}
                className={`whitespace-nowrap border-b-2 px-4 py-4 text-[13px] font-medium ${
                  tab.active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          <Outlet />
        </section>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-medium text-foreground">{value}</dd>
    </div>
  );
}
