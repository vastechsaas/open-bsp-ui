import {
  ArrowLeft,
  CalendarDays,
  ContactRound,
  Instagram,
  MessageSquareText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { WhatsAppOutlined } from "@ant-design/icons";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import {
  usePlatformAccessAudit,
  usePlatformTenantSummary,
} from "@/queries/usePlatformAdmin";
import PlatformMetricCard from "./PlatformMetricCard";

type PlatformTenantSummaryProps = {
  organizationId: string;
};

export default function PlatformTenantSummary({
  organizationId,
}: PlatformTenantSummaryProps) {
  const { translate: t } = useTranslation();
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

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-4 sm:p-6 lg:p-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/platform"
            className="mb-3 inline-flex items-center gap-2 text-[12px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("Todos los tenants")}
          </Link>
          <h1 className="text-[26px] font-semibold tracking-tight">
            {summary.organization_name}
          </h1>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {summary.organization_id}
          </p>
        </div>
        <span className="inline-flex h-9 items-center gap-2 self-start rounded-full border border-primary/30 bg-primary/10 px-3 text-[12px] font-medium text-primary">
          <ShieldCheck className="h-4 w-4" />
          {t("Solo lectura")}
        </span>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PlatformMetricCard
          icon={<UsersRound />}
          label={t("Miembros humanos")}
          value={summary.human_member_count}
          caption={t("Invitaciones aceptadas")}
        />
        <PlatformMetricCard
          icon={<ContactRound />}
          label={t("Contactos activos")}
          value={summary.active_contact_count}
        />
        <PlatformMetricCard
          icon={<MessageSquareText />}
          label={t("Conversaciones activas")}
          value={summary.active_conversation_count}
        />
        <PlatformMetricCard
          icon={<WhatsAppOutlined />}
          label="WhatsApp"
          value={summary.connected_whatsapp_account_count}
          caption={t("Cuentas conectadas")}
        />
        <PlatformMetricCard
          icon={<Instagram />}
          label="Instagram"
          value={summary.connected_instagram_account_count}
          caption={t("Cuentas conectadas")}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-[16px] font-semibold">{t("Suscripción")}</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail
              label={t("Nivel")}
              value={summary.tier_name || t("Sin nivel")}
            />
            <Detail
              label={t("Plan")}
              value={summary.plan_id || t("Sin plan")}
            />
          </dl>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-[16px] font-semibold">
            {t("Información de la organización")}
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail
              label={t("Creado")}
              value={new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(summary.organization_created_at))}
              icon={<CalendarDays />}
            />
            <Detail
              label={t("Actualizado")}
              value={new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(summary.organization_updated_at))}
              icon={<CalendarDays />}
            />
          </dl>
        </article>
      </section>
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
      <dt className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-[14px] font-medium">{value}</dd>
    </div>
  );
}
