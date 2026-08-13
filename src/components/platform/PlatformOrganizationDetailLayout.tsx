import { ArrowLeft, Building2, CalendarDays } from "lucide-react";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
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
  ];
  const wabaConnected = summary.connected_whatsapp_account_count > 0;

  return (
    <div className="w-full p-4 sm:p-6 lg:p-7">
      <Link
        to="/platform"
        className="mb-5 inline-flex items-center gap-2 text-[12px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("Vista general de la plataforma")}
      </Link>

      <header className="flex flex-col gap-5 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-[24px] font-semibold tracking-tight">
                {summary.organization_name}
              </h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  wabaConnected
                    ? "bg-emerald-500/15 text-emerald-600"
                    : "bg-amber-500/15 text-amber-600"
                }`}
              >
                {wabaConnected
                  ? t("WhatsApp conectado")
                  : t("Configuraci\u00f3n pendiente")}
              </span>
            </div>
            <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
              {summary.organization_id}
            </p>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-8 gap-y-3 lg:justify-end">
          <Detail
            label={t("Plan")}
            value={summary.tier_name || summary.plan_id || t("Sin plan")}
          />
          <Detail
            label={t("Creado")}
            value={new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
            }).format(new Date(summary.organization_created_at))}
            withCalendar
          />
        </dl>
      </header>

      <nav
        className="flex overflow-x-auto border-b border-border"
        aria-label={t("Detalles de la organizaci\u00f3n")}
      >
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            params={{ organizationId }}
            className={`whitespace-nowrap border-b-2 px-4 py-3.5 text-[13px] font-medium ${
              tab.active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="pt-5">
        <Outlet />
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  withCalendar = false,
}: {
  label: string;
  value: string;
  withCalendar?: boolean;
}) {
  return (
    <div className="min-w-[120px]">
      <dt className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {withCalendar && <CalendarDays className="h-3.5 w-3.5" />}
        {label}
      </dt>
      <dd className="mt-1 truncate text-[13px] font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}
