import {
  Building2,
  ContactRound,
  MessageSquareText,
  UsersRound,
} from "lucide-react";
import { WhatsAppOutlined } from "@ant-design/icons";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import {
  usePlatformAccessAudit,
  usePlatformOverview,
} from "@/queries/usePlatformAdmin";
import PlatformMetricCard from "./PlatformMetricCard";

export default function PlatformOverview() {
  const { translate: t } = useTranslation();
  const overview = usePlatformOverview();

  usePlatformAccessAudit("global", null, overview.isSuccess);

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 p-4 sm:p-6 lg:p-7">
      <header>
        <h1 className="text-[26px] font-semibold tracking-tight">
          {t("Vista general de la plataforma")}
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {t(
            "Supervisá el estado global y seleccioná una organización desde el buscador superior.",
          )}
        </p>
      </header>

      {overview.isPending ? (
        <div className="flex min-h-[260px] items-center justify-center">
          <Spinner size={30} className="text-primary" />
        </div>
      ) : overview.isError || !overview.data ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-[14px] text-destructive">
          {t("No se pudo cargar la vista general.")}
        </div>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <PlatformMetricCard
            icon={<Building2 />}
            label={t("Tenants")}
            value={overview.data.organization_count}
          />
          <PlatformMetricCard
            icon={<UsersRound />}
            label={t("Miembros humanos")}
            value={overview.data.human_member_count}
            caption={t("Invitaciones aceptadas")}
          />
          <PlatformMetricCard
            icon={<ContactRound />}
            label={t("Contactos activos")}
            value={overview.data.active_contact_count}
          />
          <PlatformMetricCard
            icon={<MessageSquareText />}
            label={t("Conversaciones activas")}
            value={overview.data.active_conversation_count}
          />
          <PlatformMetricCard
            icon={<WhatsAppOutlined />}
            label="WhatsApp"
            value={overview.data.connected_whatsapp_account_count}
            caption={t("Cuentas conectadas")}
          />
        </section>
      )}
    </div>
  );
}
