import {
  ContactRound,
  Instagram,
  MessageSquareText,
  UsersRound,
} from "lucide-react";
import { WhatsAppOutlined } from "@ant-design/icons";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePlatformTenantSummary } from "@/queries/usePlatformAdmin";
import PlatformMetricCard from "./PlatformMetricCard";

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
    <div className="space-y-5 p-5 sm:p-6">
      <header>
        <h2 className="text-xl font-semibold">{t("Vista general")}</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {t("Resumen operativo de la organización seleccionada.")}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-5">
        <PlatformMetricCard
          icon={<UsersRound />}
          label={t("Agentes")}
          value={summary.accepted_agent_count}
          caption={t("Agentes aceptados")}
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
        <article className="rounded-xl border border-border bg-background p-5">
          <h3 className="text-[15px] font-semibold">{t("Suscripción")}</h3>
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
        <article className="rounded-xl border border-border bg-background p-5">
          <h3 className="text-[15px] font-semibold">
            {t("Información de la organización")}
          </h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail
              label={t("Creado")}
              value={formatDate(summary.organization_created_at)}
            />
            <Detail
              label={t("Actualizado")}
              value={formatDate(summary.organization_updated_at)}
            />
          </dl>
        </article>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-[14px] font-medium">{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
