import { Link } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  RefreshCw,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Avatar from "@/components/Avatar";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { useDashboardMetrics } from "@/queries/useDashboard";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import useBoundStore from "@/stores/useBoundStore";
import {
  DASHBOARD_PERIODS,
  type DashboardPeriod,
  type TeamSnapshotMember,
} from "@/utils/DashboardUtils";

const CHART_COLORS = {
  coral: "#e47752",
  green: "#68bd78",
  blue: "#5c8ee6",
  yellow: "#eabf3f",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatChartDate(date: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export default function DashboardWorkspace() {
  const { translate: t } = useTranslation();
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const [period, setPeriod] = useState<DashboardPeriod>(7);
  const metrics = useDashboardMetrics(period);
  const { data: addresses } = useOrganizationsAddresses();
  const isConnected = addresses?.some(
    (address) =>
      address.service === "whatsapp" && address.status === "connected",
  );

  if (!organizationId) {
    return (
      <main className="flex h-full items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-[440px] rounded-2xl border border-border bg-card p-8 text-center">
          <UsersRound className="mx-auto mb-4 h-10 w-10 text-primary" />
          <h1 className="text-[22px] font-semibold">
            {t("Creá una organización")}
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {t("Necesitás una organización para ver el panel.")}
          </p>
          <Link
            to="/settings/organization/new"
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-[14px] font-semibold text-primary-foreground"
          >
            {t("Crear organización")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="h-full overflow-y-auto bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 p-5 lg:p-7">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">
              {t("Panel")}
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              {t(
                "Comprendé tus contactos, conversaciones y actividad de mensajería.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px]">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">{t("Período")}</span>
              <select
                value={period}
                onChange={(event) =>
                  setPeriod(Number(event.target.value) as DashboardPeriod)
                }
                className="bg-transparent text-foreground outline-none"
              >
                {DASHBOARD_PERIODS.map((days) => (
                  <option key={days} value={days} className="bg-background">
                    {days === 7 ? t("Últimos 7 días") : t("Últimos 30 días")}
                  </option>
                ))}
              </select>
            </label>
            <span className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px]">
              <span
                className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-muted-foreground"}`}
              />
              {isConnected ? t("Conectado") : t("Sin conexión")}
            </span>
          </div>
        </header>

        {metrics.isPending ? (
          <div className="flex min-h-[480px] items-center justify-center">
            <Spinner size={30} className="text-primary" />
          </div>
        ) : metrics.isError ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center">
            <p className="text-[15px] font-medium">
              {t("No se pudieron cargar las métricas del panel.")}
            </p>
            <button
              type="button"
              onClick={() => void metrics.refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              {t("Reintentar")}
            </button>
          </div>
        ) : metrics.data ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                icon={<UsersRound />}
                label={t("Total de contactos")}
                value={metrics.data.total_contacts}
                caption={t("Contactos activos en la organización")}
                tone="coral"
              />
              <MetricCard
                icon={<Activity />}
                label={t("Activos hoy")}
                value={metrics.data.active_today}
                caption={t("Contactos únicos hoy")}
                tone="green"
              />
              <MetricCard
                icon={<CalendarDays />}
                label={t("Activos en 7 días")}
                value={metrics.data.active_last_7_days}
                caption={t("Contactos únicos")}
                tone="blue"
              />
              <MetricCard
                icon={<CalendarDays />}
                label={t("Activos en 30 días")}
                value={metrics.data.active_last_30_days}
                caption={t("Contactos únicos")}
                tone="yellow"
              />
              <MetricCard
                icon={<UserPlus />}
                label={t("Contactos nuevos")}
                value={metrics.data.new_contacts}
                caption={
                  period === 7 ? t("Últimos 7 días") : t("Últimos 30 días")
                }
                tone="purple"
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
              <ChartCard title={t("Actividad de contactos")}>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={metrics.data.contact_activity}>
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      opacity={0.18}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      width={36}
                      allowDecimals={false}
                    />
                    <Tooltip
                      labelFormatter={(label) => formatChartDate(String(label))}
                    />
                    <Line
                      type="monotone"
                      dataKey="active_contacts"
                      name={t("Contactos activos")}
                      stroke={CHART_COLORS.green}
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="new_contacts"
                      name={t("Contactos nuevos")}
                      stroke={CHART_COLORS.blue}
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title={t("Carga de conversaciones")}>
                <ConversationWorkload
                  open={metrics.data.open_conversations}
                  unassigned={metrics.data.unassigned_conversations}
                  closed={metrics.data.closed_conversations}
                  labels={{
                    open: t("Abiertas"),
                    unassigned: t("Sin asignar"),
                    closed: t("Cerradas"),
                  }}
                />
              </ChartCard>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(380px,1fr)]">
              <ChartCard title={t("Actividad de mensajería")}>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={metrics.data.message_activity}>
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      opacity={0.18}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      width={36}
                      allowDecimals={false}
                    />
                    <Tooltip
                      labelFormatter={(label) => formatChartDate(String(label))}
                    />
                    <Line
                      type="monotone"
                      dataKey="sent"
                      name={t("Enviados")}
                      stroke={CHART_COLORS.coral}
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="received"
                      name={t("Recibidos")}
                      stroke={CHART_COLORS.green}
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <TeamSnapshot members={metrics.data.team_snapshot} />
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  caption,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  caption: string;
  tone: "coral" | "green" | "blue" | "yellow" | "purple";
}) {
  const tones = {
    coral: "border-primary/30 bg-primary/10 text-primary",
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    yellow: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    purple: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  };

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border [&>svg]:h-5 [&>svg]:w-5 ${tones[tone]}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] text-muted-foreground">{label}</p>
          <p className="mt-1 text-[25px] font-semibold tracking-tight">
            {formatNumber(value)}
          </p>
        </div>
      </div>
      <p className="mt-3 truncate text-[11px] text-muted-foreground">
        {caption}
      </p>
    </article>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-4 text-[16px] font-semibold">{title}</h2>
      {children}
    </article>
  );
}

function ConversationWorkload({
  open,
  unassigned,
  closed,
  labels,
}: {
  open: number;
  unassigned: number;
  closed: number;
  labels: { open: string; unassigned: string; closed: string };
}) {
  const data = [
    { name: labels.open, value: open, color: CHART_COLORS.coral },
    { name: labels.unassigned, value: unassigned, color: CHART_COLORS.yellow },
    { name: labels.closed, value: closed, color: CHART_COLORS.green },
  ];

  return (
    <div className="grid min-h-[260px] items-center gap-2 sm:grid-cols-[minmax(180px,1fr)_1fr] xl:grid-cols-1 2xl:grid-cols-[minmax(180px,1fr)_1fr]">
      <ResponsiveContainer width="100%" height={210}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={55}
            outerRadius={82}
            strokeWidth={0}
          >
            {data.map((item) => (
              <Cell key={item.name} fill={item.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-3">
        {data.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between gap-4 text-[13px]"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
            <span className="font-medium">{formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamSnapshot({ members }: { members: TeamSnapshotMember[] }) {
  const { translate: t } = useTranslation();

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <h2 className="px-4 pb-3 pt-4 text-[16px] font-semibold">
        {t("Resumen del equipo")}
      </h2>
      {members.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-[12px]">
            <thead className="border-y border-border bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">{t("Miembro")}</th>
                <th className="px-2 py-2.5 text-right font-medium">
                  {t("Asignadas")}
                </th>
                <th className="px-2 py-2.5 text-right font-medium">
                  {t("Abiertas")}
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  {t("Cerradas")}
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Avatar
                        src={member.picture || undefined}
                        fallback={member.name.charAt(0)}
                        size={26}
                        className="bg-primary text-[11px] text-primary-foreground"
                      />
                      <span className="max-w-[150px] truncate">
                        {member.name}
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-3 text-right">
                    {formatNumber(member.assigned)}
                  </td>
                  <td className="px-2 py-3 text-right">
                    {formatNumber(member.open)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatNumber(member.closed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex min-h-[180px] items-center justify-center px-4 text-[13px] text-muted-foreground">
          {t("Todavía no hay actividad del equipo.")}
        </div>
      )}
      <Link
        to="/team-members"
        className="flex items-center border-t border-border px-4 py-3 text-[12px] font-medium text-primary hover:bg-primary/5"
      >
        {t("Ver miembros del equipo")}
      </Link>
    </article>
  );
}
