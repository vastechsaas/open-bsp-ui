import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePlatformTenantSummary } from "@/queries/usePlatformAdmin";

export default function PlatformTenantSummary({
  organizationId,
}: {
  organizationId: string;
}) {
  const { translate: t } = useTranslation();
  const tenant = usePlatformTenantSummary(organizationId);

  if (tenant.isPending) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Spinner size={26} className="text-primary" />
      </div>
    );
  }

  if (tenant.isError || !tenant.data) {
    return (
      <div className="flex min-h-[360px] items-center justify-center p-6 text-center text-destructive">
        {t("No se pudo cargar el resumen del tenant.")}
      </div>
    );
  }

  const summary = tenant.data;

  return (
    <div className="max-w-[1320px]">
      <header className="mb-6">
        <h2 className="text-xl font-semibold">
          {t("Resumen de la organizaci\u00f3n")}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {t(
            "Revis\u00e1 la configuraci\u00f3n y el acceso de esta organizaci\u00f3n.",
          )}
        </p>
      </header>

      <AdminSection title={t("Informaci\u00f3n de la organizaci\u00f3n")}>
        <AdminRow
          label={t("Nombre de la organizaci\u00f3n")}
          value={summary.organization_name}
        />
        <AdminRow
          label={t("ID de la organizaci\u00f3n")}
          value={summary.organization_id}
          monospace
        />
        <AdminRow
          label={t("Creado")}
          value={formatDate(summary.organization_created_at)}
        />
        <AdminRow
          label={t("Actualizado")}
          value={formatDate(summary.organization_updated_at)}
        />
        <AdminRow
          label={t("Nivel")}
          value={summary.tier_name || t("Sin nivel")}
        />
        <AdminRow label={t("Plan")} value={summary.plan_id || t("Sin plan")} />
      </AdminSection>

      <AdminSection title={t("Acceso operativo")}>
        <AdminRow
          label={t("Agentes aceptados")}
          value={String(summary.accepted_agent_count)}
          action={
            <Link
              to="/platform/$organizationId/agents"
              params={{ organizationId }}
              className="text-[12px] font-medium text-primary hover:underline"
            >
              {t("Abrir agentes")}
            </Link>
          }
        />
        <AdminRow
          label={t("Miembros humanos")}
          value={String(summary.human_member_count)}
        />
        <AdminRow
          label={t("Contactos activos")}
          value={String(summary.active_contact_count)}
        />
        <AdminRow
          label={t("Conversaciones activas")}
          value={String(summary.active_conversation_count)}
        />
      </AdminSection>

      <AdminSection title={t("Canales conectados")}>
        <ChannelRow
          channel="WhatsApp"
          count={summary.connected_whatsapp_account_count}
          t={t}
        />
      </AdminSection>
    </div>
  );
}

function AdminSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-7">
      <h3 className="border-b border-border pb-3 text-[15px] font-semibold">
        {title}
      </h3>
      <dl>{children}</dl>
    </section>
  );
}

function AdminRow({
  label,
  value,
  monospace = false,
  action,
}: {
  label: string;
  value: string;
  monospace?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-11 grid-cols-[minmax(150px,260px)_minmax(0,1fr)_auto] items-center gap-4 border-b border-border/70 px-2 py-2.5 text-[13px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={monospace ? "truncate font-mono text-[11px]" : "font-medium"}
      >
        {value}
      </dd>
      <dd>{action}</dd>
    </div>
  );
}

function ChannelRow({
  channel,
  count,
  t,
}: {
  channel: string;
  count: number;
  t: (value: string) => string;
}) {
  const connected = count > 0;

  return (
    <div className="grid min-h-11 grid-cols-[minmax(150px,260px)_minmax(0,1fr)] items-center gap-4 border-b border-border/70 px-2 py-2.5 text-[13px]">
      <dt className="text-muted-foreground">{channel}</dt>
      <dd className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
            connected
              ? "bg-emerald-500/15 text-emerald-600"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {connected ? t("Conectado") : t("Desconectado")}
        </span>
        <span className="text-muted-foreground">
          {count} {count === 1 ? t("Cuenta") : t("Cuentas")}
        </span>
      </dd>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
