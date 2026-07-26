import { createFileRoute, Outlet } from "@tanstack/react-router";
import useBoundStore from "@/stores/useBoundStore";
import Menu from "@/components/Menu";
import Chat from "@/components/Chat";
import ChatHeader from "@/components/ChatHeader";
import ChatFooter from "@/components/ChatFooter";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import FilePicker from "@/components/FileUploader/FilePicker";
import FilePreviewer from "@/components/FilePreviewer";
import ActionCard from "@/components/ActionCard";
import { useTranslation } from "@/hooks/useTranslation";
import {
  // Bot,
  Building2,
  MessageSquarePlus,
  Settings,
} from "lucide-react";
import { useResizable } from "@/hooks/useResizable";
// import { useCurrentAgents } from "@/queries/useAgents";
import StatsCenter from "@/components/stats/StatsCenter";
import { isCampaignWorkspacePath } from "@/utils/CampaignUtils";
import {
  isChatbotEditorPath,
  isChatbotWorkspacePath,
} from "@/utils/ChatbotFlowUtils";
import { isTemplateWorkspacePath } from "@/utils/TemplateDraftUtils";
import { isWhatsAppManagerWorkspacePath } from "@/utils/WhatsAppManagerUtils";
import { isTeamMembersWorkspacePath } from "@/utils/TeamMembersUtils";
import { isDashboardWorkspacePath } from "@/utils/DashboardUtils";
import {
  getResizablePanelMaxWidth,
  getSidebarWidth,
  isSidebarExpanded,
  SIDEBAR_DESKTOP_BREAKPOINT,
} from "@/utils/SidebarUtils";

export const Route = createFileRoute("/_auth")({
  component: AppLayout,
});

const MIN_PANEL_WIDTH = 300;

function AppLayout() {
  const { translate: t } = useTranslation();
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);
  const sidebarCollapsed = useBoundStore((state) => state.ui.sidebarCollapsed);
  const setSidebarCollapsed = useBoundStore(
    (state) => state.ui.setSidebarCollapsed,
  );
  // AI-agent onboarding is intentionally hidden for the Meta review.
  // const { data: agents } = useCurrentAgents();
  // const hasAiAgents = agents?.some((a) => a.ai);
  const activeConvId = useBoundStore((state) => state.ui.activeConvId);
  const setActiveConv = useBoundStore((state) => state.ui.setActiveConv);
  const location = useLocation();
  const pathname = location.pathname;
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const menuWidth = getSidebarWidth(viewportWidth, sidebarCollapsed);
  const sidebarExpanded = isSidebarExpanded(viewportWidth, sidebarCollapsed);
  const canToggleSidebar = viewportWidth >= SIDEBAR_DESKTOP_BREAKPOINT;
  const isStatsRoute = pathname.startsWith("/stats");
  const isFullscreenWorkspaceRoute = isChatbotEditorPath(pathname);
  const isWorkspaceRoute =
    isDashboardWorkspacePath(pathname) ||
    isCampaignWorkspacePath(pathname) ||
    isChatbotWorkspacePath(pathname) ||
    isTemplateWorkspacePath(pathname) ||
    isWhatsAppManagerWorkspacePath(pathname) ||
    isTeamMembersWorkspacePath(pathname);

  const [isHoveringFiles, setIsHoveringFiles] = useState(false);
  const getMaxPanelWidth = useCallback(
    () => getResizablePanelMaxWidth(window.innerWidth, menuWidth),
    [menuWidth],
  );

  const {
    width: panelWidth,
    panelRef,
    handleMouseDown,
  } = useResizable({
    minWidth: MIN_PANEL_WIDTH,
    getMaxWidth: getMaxPanelWidth,
  });
  const effectivePanelWidth =
    panelWidth === null
      ? null
      : Math.min(
          panelWidth,
          getResizablePanelMaxWidth(viewportWidth, menuWidth),
        );

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  // Sync fragment identifier with activeConvId
  // i.e. /conversations#1234
  useEffect(() => {
    const convId = location.hash;
    setActiveConv(convId);
  }, [location.hash, setActiveConv]);

  console.log("--------");
  console.log("active org ", activeOrgId);
  console.log("active conv", activeConvId);

  const showCenterPanel = activeConvId || isStatsRoute || isWorkspaceRoute;
  const gridTemplateColumns = isFullscreenWorkspaceRoute
    ? "1fr"
    : isWorkspaceRoute
      ? `${menuWidth}px 1fr`
      : effectivePanelWidth !== null
        ? `${menuWidth}px ${effectivePanelWidth}px 1fr`
        : `${menuWidth}px minmax(${MIN_PANEL_WIDTH}px, 1fr) 2fr`;

  return (
    <div
      className="app-grid transition-[grid-template-columns] duration-200"
      style={viewportWidth >= 768 ? { gridTemplateColumns } : undefined}
    >
      {/* Menu - Fixed width */}
      <div
        className={
          isFullscreenWorkspaceRoute
            ? "hidden"
            : showCenterPanel
              ? "hidden md:flex"
              : "flex"
        }
      >
        <Menu
          expanded={sidebarExpanded}
          canToggle={canToggleSidebar}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>
      {/* Left Panel - Router Outlet */}
      <div
        ref={panelRef}
        className={
          "flex-col overflow-hidden md:border-r border-border bg-background text-foreground col-span-2 md:col-span-1 relative " +
          (isWorkspaceRoute
            ? "hidden"
            : showCenterPanel
              ? "hidden md:flex"
              : "flex")
        }
      >
        {!isWorkspaceRoute && <Outlet />}
        {/* Resize Handle */}
        <div className="resize-handle z-[60]" onMouseDown={handleMouseDown} />
      </div>

      {/* Center Panel */}
      <div
        className={
          "flex-col min-w-0 relative overflow-hidden col-span-full md:col-span-1" +
          (isWorkspaceRoute
            ? " flex bg-background text-foreground"
            : isStatsRoute
              ? " flex bg-muted"
              : activeConvId
                ? " flex bg-chat"
                : " hidden md:flex bg-muted")
        }
        onDragEnter={() => setIsHoveringFiles(true)}
        onDrop={() => setIsHoveringFiles(false)}
      >
        {isWorkspaceRoute ? (
          <Outlet />
        ) : isStatsRoute ? (
          <div className="overflow-y-auto h-full">
            <StatsCenter />
          </div>
        ) : activeConvId ? (
          <>
            {isHoveringFiles && <FilePicker setHovering={setIsHoveringFiles} />}
            <FilePreviewer />
            <ChatHeader />
            <Chat />
            <ChatFooter />
          </>
        ) : (
          <div className="flex gap-[32px] items-center justify-center h-full">
            {!activeOrgId && (
              <ActionCard
                icon={<Building2 className="w-[24px] h-[24px]" />}
                title={t("Crear organización")}
                to="/settings/organization/new"
              />
            )}
            {activeOrgId && (
              <>
                {/* AI-agent onboarding is intentionally hidden for the Meta review.
                {!hasAiAgents && (
                  <ActionCard
                    icon={<Bot className="w-[24px] h-[24px]" />}
                    title={t("Crear agente")}
                    to="/agents/new"
                  />
                )}
                */}
                <ActionCard
                  icon={<MessageSquarePlus className="w-[24px] h-[24px]" />}
                  title={t("Iniciar conversación")}
                  to="/conversations/new"
                />
                <ActionCard
                  icon={<Settings className="w-[24px] h-[24px]" />}
                  title={t("Configurar WhatsApp")}
                  to="/integrations/whatsapp/new"
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
