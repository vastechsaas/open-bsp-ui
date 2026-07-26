import { WhatsAppOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronDown,
  Languages,
  LayoutTemplate,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquareText,
  NotebookTabs,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Unplug,
  UsersRound,
  Workflow,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import { useOrganizations } from "@/queries/useOrganizations";
import useBoundStore from "@/stores/useBoundStore";
import { supabase } from "@/supabase/client";
import { resetAuthorizedCache } from "@/utils/IdbUtils";
import Avatar from "./Avatar";
import { LinkButton } from "./LinkButton";

type MenuProps = {
  expanded: boolean;
  canToggle: boolean;
  onToggle: () => void;
};

export default function Menu({ expanded, canToggle, onToggle }: MenuProps) {
  const user = useBoundStore((state) => state.ui.user);
  const { data: agent } = useCurrentAgent();
  const setActiveOrg = useBoundStore((state) => state.ui.setActiveOrg);
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);
  const { data: organizations } = useOrganizations();
  const {
    translate: t,
    currentLanguage,
    setCurrentLanguage,
  } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const metadata = user?.user_metadata as
    | { name?: string; picture?: string }
    | undefined;
  const userName = agent?.name || metadata?.name || user?.email || "?";
  const userPicture = agent?.picture || metadata?.picture;
  const navigationPadding = expanded ? "px-[12px]" : "px-[7px]";

  return (
    <aside className="z-10 flex h-full w-full min-w-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div
        className={`flex h-[64px] shrink-0 items-center border-b border-sidebar-border ${
          expanded
            ? "gap-[10px] px-[14px]"
            : "justify-center gap-[4px] px-[5px]"
        }`}
      >
        <img
          src={expanded ? "/SocialConnectLarge.png" : "/SocialConnectSmall.png"}
          alt="Social Connect"
          className={`${expanded ? "h-[38px] w-[38px]" : "h-[34px] w-[34px]"} shrink-0 rounded-md object-contain`}
        />
        {expanded && (
          <span className="truncate text-[16px] font-semibold tracking-tight text-sidebar-foreground">
            Social Connect
          </span>
        )}
        {canToggle && (
          <button
            type="button"
            aria-label={
              expanded ? t("Contraer navegación") : t("Expandir navegación")
            }
            title={
              expanded ? t("Contraer navegación") : t("Expandir navegación")
            }
            className={`${expanded ? "ml-auto" : ""} flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
            onClick={onToggle}
          >
            {expanded ? (
              <PanelLeftClose className="h-[17px] w-[17px]" />
            ) : (
              <PanelLeftOpen className="h-[17px] w-[17px]" />
            )}
          </button>
        )}
      </div>

      <nav
        aria-label={t("Navegación principal")}
        className={`scrollbar-hide flex-1 overflow-y-auto py-[10px] ${navigationPadding}`}
      >
        <MenuGroupLabel expanded={expanded} label={t("Espacio de trabajo")} />
        <div className="space-y-[3px]">
          <LinkButton
            to="/dashboard"
            title={t("Panel")}
            isActive={pathname === "/dashboard"}
            expanded={expanded}
          >
            <LayoutDashboard className="h-[21px] w-[21px] stroke-[2]" />
          </LinkButton>

          <LinkButton
            to="/conversations"
            title={t("Mensajes")}
            isActive={pathname.startsWith("/conversations")}
            expanded={expanded}
          >
            <MessageSquareText className="h-[21px] w-[21px] stroke-[2]" />
          </LinkButton>

          {/* AI agents are intentionally hidden for the Meta review.
          <LinkButton
            to="/agents"
            title={t("Agentes")}
            isActive={pathname.startsWith("/agents")}
            expanded={expanded}
          >
            <Bot className="h-[21px] w-[21px] stroke-[2]" />
          </LinkButton>
          */}

          <LinkButton
            to="/contacts"
            title={t("Contactos")}
            isActive={pathname.startsWith("/contacts")}
            expanded={expanded}
          >
            <NotebookTabs className="h-[21px] w-[21px] stroke-[2]" />
          </LinkButton>

          <LinkButton
            to="/campaigns"
            title={t("Campañas")}
            isActive={pathname.startsWith("/campaigns")}
            expanded={expanded}
          >
            <Megaphone className="h-[21px] w-[21px] stroke-[2]" />
          </LinkButton>

          <LinkButton
            to="/chatbots"
            title={t("Chatbots")}
            isActive={pathname.startsWith("/chatbots")}
            expanded={expanded}
          >
            <Workflow className="h-[21px] w-[21px] stroke-[2]" />
          </LinkButton>

          <LinkButton
            to="/templates"
            title={t("Gestor de plantillas")}
            isActive={pathname.startsWith("/templates")}
            expanded={expanded}
          >
            <LayoutTemplate className="h-[21px] w-[21px] stroke-[2]" />
          </LinkButton>

          <LinkButton
            to="/team-members"
            title={t("Miembros del equipo")}
            isActive={pathname.startsWith("/team-members")}
            expanded={expanded}
          >
            <UsersRound className="h-[21px] w-[21px] stroke-[2]" />
          </LinkButton>
        </div>

        <MenuGroupLabel
          expanded={expanded}
          label={t("Herramientas")}
          separated
        />
        <div className="space-y-[3px]">
          <LinkButton
            to="/integrations"
            title={t("Integraciones")}
            isActive={pathname.startsWith("/integrations")}
            expanded={expanded}
          >
            <Unplug className="h-[21px] w-[21px] stroke-[2]" />
          </LinkButton>

          <LinkButton
            to="/stats"
            title={t("Estadísticas")}
            isActive={pathname.startsWith("/stats")}
            expanded={expanded}
          >
            <BarChart3 className="h-[21px] w-[21px] stroke-[2]" />
          </LinkButton>
        </div>
      </nav>

      <div
        className={`shrink-0 space-y-[3px] border-t border-sidebar-border py-[8px] ${navigationPadding}`}
      >
        <LinkButton
          to="/whatsapp-manager"
          title={t("Gestor de WhatsApp")}
          isActive={pathname.startsWith("/whatsapp-manager")}
          expanded={expanded}
        >
          <WhatsAppOutlined className="text-[20px]" />
        </LinkButton>

        <LinkButton
          to="/settings"
          title={t("Preferencias")}
          isActive={pathname.startsWith("/settings")}
          expanded={expanded}
        >
          <Settings className="h-[20px] w-[20px] stroke-[2]" />
        </LinkButton>

        <Dropdown
          menu={{
            items: [
              {
                key: "user_email",
                type: "group",
                label: user?.email || "",
              },
              { type: "divider" },
              {
                key: "orgs",
                type: "group",
                label: t("Organizaciones"),
                children: [
                  ...(organizations?.map((organization) => ({
                    key: organization.id,
                    label: organization.name,
                    onClick: () => {
                      setActiveOrg(organization.id);
                      void navigate({ to: "/dashboard" });
                    },
                  })) || []),
                  {
                    key: "new_org",
                    label: t("Nueva organización"),
                    icon: <Plus className="h-[16px] w-[16px]" />,
                    onClick: () =>
                      void navigate({
                        to: "/settings/organization/new",
                        hash: (previousHash) => previousHash!,
                      }),
                  },
                ],
              },
              { type: "divider" },
              {
                key: "lang",
                label: t("Idioma"),
                icon: <Languages className="h-[16px] w-[16px]" />,
                children: (["es", "en", "pt", "sw", "fr"] as const).map(
                  (language) => ({
                    key: language,
                    label: {
                      es: "Español",
                      en: "English",
                      pt: "Português",
                      sw: "Kiswahili",
                      fr: "Français",
                    }[language],
                    className:
                      language === currentLanguage
                        ? "ant-dropdown-menu-item-selected"
                        : "",
                    onClick: () => setCurrentLanguage(language),
                  }),
                ),
              },
              { type: "divider" },
              {
                key: "logout",
                label: t("Cerrar sesión"),
                icon: <LogOut className="h-[16px] w-[16px]" />,
                onClick: () => {
                  void supabase.auth.signOut();
                  void resetAuthorizedCache();
                },
              },
            ],
            selectable: true,
            selectedKeys: [...(activeOrgId ? [activeOrgId] : [])],
          }}
          trigger={["click"]}
        >
          <button
            type="button"
            aria-label={t("Abrir menú de usuario")}
            title={expanded ? undefined : userName}
            className={`mt-[4px] flex h-[46px] w-full items-center rounded-lg hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
              expanded
                ? "gap-[10px] px-[8px] text-left"
                : "justify-center px-[4px]"
            }`}
          >
            <Avatar
              src={userPicture}
              fallback={userName.charAt(0)}
              size={32}
              className="shrink-0 border border-sidebar-border bg-primary text-[14px] text-primary-foreground"
            />
            {expanded && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-sidebar-foreground">
                    {userName}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {user?.email || ""}
                  </span>
                </span>
                <ChevronDown className="h-[15px] w-[15px] shrink-0 text-muted-foreground" />
              </>
            )}
          </button>
        </Dropdown>
      </div>
    </aside>
  );
}

function MenuGroupLabel({
  expanded,
  label,
  separated = false,
}: {
  expanded: boolean;
  label: string;
  separated?: boolean;
}) {
  if (!expanded) {
    return separated ? (
      <div className="mx-[6px] my-[9px] border-t border-sidebar-border" />
    ) : null;
  }

  return (
    <div
      className={`${separated ? "mt-[18px]" : ""} mb-[7px] px-[10px] text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`}
    >
      {label}
    </div>
  );
}
