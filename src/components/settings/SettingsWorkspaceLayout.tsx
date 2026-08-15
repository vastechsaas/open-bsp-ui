import { Building2, KeyRound, Route, Webhook, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";

type SettingsWorkspaceLayoutProps = {
  children: ReactNode;
};

const settingsNavigation = [
  {
    to: "/settings/routing-queues",
    title: "Colas de enrutamiento",
    description: "Destinos de entrega humana y sus agentes.",
    icon: Route,
  },
  {
    to: "/settings/automation",
    title: "Automatización",
    description: "Controlá los comportamientos automáticos de tu organización.",
    icon: Zap,
  },
  {
    to: "/settings/organization",
    title: "Organización",
    description: "Información y comportamiento del espacio de trabajo.",
    icon: Building2,
  },
  {
    to: "/settings/webhooks",
    title: "Webhooks",
    description: "Eventos para sistemas externos.",
    icon: Webhook,
  },
  {
    to: "/settings/api-keys",
    title: "Claves API",
    description: "Credenciales para integraciones.",
    icon: KeyRound,
  },
] as const;

export default function SettingsWorkspaceLayout({
  children,
}: SettingsWorkspaceLayoutProps) {
  const { translate: t } = useTranslation();
  const location = useLocation();
  const { data: currentAgent } = useCurrentAgent();
  const navigation =
    currentAgent?.extra?.role === "supervisor"
      ? settingsNavigation.filter(
          (item) =>
            item.to === "/settings/routing-queues" ||
            item.to === "/settings/automation",
        )
      : settingsNavigation;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/30 text-foreground">
      <header className="shrink-0 border-b border-border bg-background px-5 py-5 sm:px-7 lg:px-8">
        <h1 className="text-[26px] font-semibold tracking-tight text-primary">
          {t("Preferencias")}
        </h1>
        <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">
          {t(
            "Administra la configuración de tu organización y las herramientas para desarrolladores.",
          )}
        </p>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:p-5 lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-5 lg:overflow-hidden lg:p-6">
        <aside className="h-fit rounded-2xl border border-border bg-card p-2 shadow-sm lg:h-full lg:overflow-y-auto">
          <nav
            aria-label={t("Preferencias")}
            className="grid gap-1 sm:grid-cols-3 lg:grid-cols-1"
          >
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex min-w-0 items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    active
                      ? "border-primary/30 bg-primary/10 text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      active ? "bg-primary/15 text-primary" : "bg-muted"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold">
                      {t(item.title)}
                    </span>
                    <span className="mt-0.5 hidden text-[11px] leading-4 text-muted-foreground lg:block">
                      {t(item.description)}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
