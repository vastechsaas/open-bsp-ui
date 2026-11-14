import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import useBoundStore from "@/stores/useBoundStore";
import Menu from "@/components/Menu";
import MobileWorkspaceNavigation from "@/components/MobileWorkspaceNavigation";
import Chat from "@/components/Chat";
import ChatHeader from "@/components/ChatHeader";
import ChatFooter from "@/components/ChatFooter";
import MessagesWorkspaceHeader from "@/components/MessagesWorkspaceHeader";
import ConversationOwnershipBanner from "@/components/ConversationOwnershipBanner";
import { useCallback, useEffect, useState } from "react";
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
import { isQuickRepliesWorkspacePath } from "@/utils/QuickReplyUtils";
import { isContactManagerWorkspacePath } from "@/utils/ContactManagerUtils";
import { isSettingsWorkspacePath } from "@/utils/SettingsUtils";
import CustomerDetailsPanel from "@/components/CustomerDetailsPanel";
import { useCurrentAgent, useInvitations } from "@/queries/useAgents";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import { useOrganizationAppearanceSettings } from "@/queries/useOrganizationAppearance";
import { useOrganizations } from "@/queries/useOrganizations";
import PendingInvitationGate from "@/components/PendingInvitationGate";
import { useModulePermissionRefresh } from "@/queries/useModulePermissions";
import {
  WorkspaceLoadError,
  WorkspaceSkeleton,
} from "@/components/WorkspaceLoading";
import { workspaceStartupState } from "@/utils/WorkspaceLoadingUtils";
import { useWorkspaceArrival } from "@/stores/workspaceArrival";
import IntegrationManagementGate from "@/components/IntegrationManagementGate";
import {
  useIntegrationAvailability,
  useIntegrationAvailabilityRefresh,
} from "@/queries/useIntegrationAvailability";
import {
  integrationEnabled,
  managementIntegration,
} from "@/utils/IntegrationAvailabilityUtils";
import { resetAuthorizedCache } from "@/utils/IdbUtils";
import {
  canAccessNavigation,
  canAccessPath,
  getDefaultPathForRole,
} from "@/utils/RoleAccess";
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
  useIntegrationAvailabilityRefresh();
  const integrationAvailability = useIntegrationAvailability();
  useModulePermissionRefresh();
  const { translate: t } = useTranslation();
  const signedIn = useBoundStore((state) => !!state.ui.user);
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);
  const setActiveOrg = useBoundStore((state) => state.ui.setActiveOrg);
  const organizations = useOrganizations();
  const invitations = useInvitations();
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
  const navigate = useNavigate();
  const membership = useCurrentAgent();
  const { data: organizationAddresses } = useOrganizationsAddresses();
  const { data: appearanceSettings } = useOrganizationAppearanceSettings();
  const hasConnectedWhatsApp = organizationAddresses?.some(
    (address) =>
      address.service === "whatsapp" && address.status === "connected",
  );
  const pathname = location.pathname;
  const integration = managementIntegration(pathname);
  const routeContent = integration ? (
    <IntegrationManagementGate integration={integration}>
      <Outlet />
    </IntegrationManagementGate>
  ) : (
    <Outlet />
  );
  const isMessagesRoute =
    pathname === "/conversations" || pathname === "/conversations/";
  const currentRole = membership.data?.extra?.role;
  const canAccessCurrentPath =
    !activeOrgId ||
    // Builder routes own their loading, unavailable and permission-error states.
    // Do not redirect away before they can explain a live access revocation.
    isChatbotWorkspacePath(pathname) ||
    canAccessPath(currentRole, pathname);
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
    isTeamMembersWorkspacePath(pathname) ||
    isQuickRepliesWorkspacePath(pathname) ||
    isContactManagerWorkspacePath(pathname) ||
    isSettingsWorkspacePath(pathname);
  const hasPendingInvitations = (invitations.data?.length ?? 0) > 0;
  const activeOrganizationIsValid =
    !!activeOrgId &&
    !!organizations.data?.some(
      (organization) => organization.id === activeOrgId,
    );
  const startup = workspaceStartupState({
    signedIn,
    organizations,
    invitations,
    organizationCount: organizations.data?.length ?? 0,
    hasPendingInvitations,
    hasActiveOrganization: !!activeOrgId,
    activeOrganizationIsValid,
    membership,
    hasRole: !!currentRole,
  });
  const workspaceReady = startup === "ready";
  const redirecting = workspaceReady && !canAccessCurrentPath;
  const showStartup =
    startup === "loading" || startup === "error" || redirecting;
  const showMessagesLayout =
    isMessagesRoute && !showStartup && !hasPendingInvitations;

  function retryStartup() {
    if (organizations.data === undefined && organizations.isError)
      void organizations.refetch();
    if (invitations.data === undefined && invitations.isError)
      void invitations.refetch();
    if (activeOrganizationIsValid && !currentRole) void membership.refetch();
  }

  const [isHoveringFiles, setIsHoveringFiles] = useState(false);
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false);
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

  useEffect(() => {
    document.documentElement.dataset.chatBubbleTheme =
      appearanceSettings?.chat_bubble_theme ?? "orange";
  }, [activeOrgId, appearanceSettings?.chat_bubble_theme]);

  useEffect(() => {
    if (!activeOrgId || !organizations.isSuccess) return;
    if (
      organizations.data?.some(
        (organization) => organization.id === activeOrgId,
      )
    )
      return;

    setActiveOrg(null);
    setActiveConv(null);
    void resetAuthorizedCache();
    void navigate({ to: "/settings/organization/archived", replace: true });
  }, [
    activeOrgId,
    navigate,
    organizations.data,
    organizations.isSuccess,
    setActiveConv,
    setActiveOrg,
  ]);

  // Sync fragment identifier with activeConvId
  // i.e. /conversations#1234
  useEffect(() => {
    const convId = location.hash;
    setActiveConv(convId);
  }, [location.hash, setActiveConv]);

  useEffect(() => {
    if (redirecting) {
      void navigate({
        to: getDefaultPathForRole(currentRole),
        replace: true,
      });
    }
  }, [redirecting, currentRole, navigate]);

  const arrivalStartedAt = useWorkspaceArrival((state) => state.startedAt);
  useEffect(() => {
    if (arrivalStartedAt !== null && startup !== "loading" && !redirecting)
      useWorkspaceArrival.getState().ready(pathname);
  }, [arrivalStartedAt, pathname, redirecting, startup]);

  const showCenterPanel =
    activeConvId ||
    isStatsRoute ||
    isWorkspaceRoute ||
    hasPendingInvitations ||
    showStartup;
  const gridTemplateColumns = isFullscreenWorkspaceRoute
    ? "1fr"
    : isWorkspaceRoute || showStartup || hasPendingInvitations
      ? `${menuWidth}px 1fr`
      : effectivePanelWidth !== null
        ? `${menuWidth}px ${effectivePanelWidth}px 1fr`
        : `${menuWidth}px minmax(${MIN_PANEL_WIDTH}px, 1fr) 2fr`;

  return (
    <div
      className={`app-grid transition-[grid-template-columns] duration-200 ${showMessagesLayout ? "messages-workspace" : ""}`}
      style={viewportWidth >= 768 ? { gridTemplateColumns } : undefined}
    >
      {/* Menu - Fixed width */}
      <div
        className={
          (showMessagesLayout ? "row-span-2 " : "") +
          (isFullscreenWorkspaceRoute
            ? "hidden"
            : showCenterPanel
              ? "hidden md:flex"
              : "flex")
        }
      >
        <Menu
          expanded={sidebarExpanded}
          canToggle={canToggleSidebar}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>
      {showMessagesLayout && (
        <div
          className={`min-w-0 ${activeConvId ? "col-span-full md:col-start-2" : "col-start-2"} col-end-[-1] row-start-1`}
        >
          <MessagesWorkspaceHeader />
        </div>
      )}
      {/* Left Panel - Router Outlet */}
      <div
        ref={panelRef}
        className={
          "flex-col overflow-hidden md:border-r border-border bg-background text-foreground md:col-span-1 relative " +
          (showMessagesLayout ? "col-span-1 " : "col-span-2 ") +
          (isWorkspaceRoute || showStartup || hasPendingInvitations
            ? "hidden"
            : showCenterPanel
              ? "hidden md:flex"
              : "flex")
        }
      >
        {!isWorkspaceRoute && workspaceReady && !redirecting && routeContent}
        {/* Resize Handle */}
        <div className="resize-handle z-[60]" onMouseDown={handleMouseDown} />
      </div>

      {/* Center Panel */}
      <div
        className={
          "flex-col min-w-0 relative overflow-hidden col-span-full md:col-span-1" +
          (showStartup
            ? " flex bg-background text-foreground overflow-y-auto"
            : hasPendingInvitations
              ? " flex bg-muted"
              : isWorkspaceRoute
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
        {viewportWidth < 768 &&
          (isWorkspaceRoute || isStatsRoute) &&
          !isFullscreenWorkspaceRoute &&
          !hasPendingInvitations && (
            <MobileWorkspaceNavigation key={`${activeOrgId}:${pathname}`} />
          )}
        {hasPendingInvitations ? (
          <PendingInvitationGate invitations={invitations.data ?? []} />
        ) : showStartup ? (
          startup === "error" ? (
            <WorkspaceLoadError
              title={t("No se pudo cargar el espacio de trabajo.")}
              onRetry={retryStartup}
            />
          ) : (
            <WorkspaceSkeleton
              variant="workspace"
              label={t("Cargando el espacio de trabajo…")}
            />
          )
        ) : isWorkspaceRoute ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {routeContent}
          </div>
        ) : isStatsRoute ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <StatsCenter />
          </div>
        ) : activeConvId ? (
          <div className="flex min-h-0 min-w-0 flex-1">
            <div
              className={`${
                customerDetailsOpen ? "hidden md:flex" : "flex"
              } min-h-0 min-w-0 flex-1 flex-col`}
            >
              {isHoveringFiles && (
                <FilePicker setHovering={setIsHoveringFiles} />
              )}
              <FilePreviewer />
              <ChatHeader
                customerDetailsOpen={customerDetailsOpen}
                onToggleCustomerDetails={() =>
                  setCustomerDetailsOpen((open) => !open)
                }
              />
              <ConversationOwnershipBanner conversationId={activeConvId} />
              <Chat />
              <ChatFooter />
            </div>
            {customerDetailsOpen && (
              <CustomerDetailsPanel
                onClose={() => setCustomerDetailsOpen(false)}
              />
            )}
          </div>
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
                {canAccessNavigation(currentRole, "integrations") &&
                  integrationAvailability.isSuccess &&
                  integrationEnabled(
                    integrationAvailability.data,
                    "whatsapp",
                  ) && (
                    <ActionCard
                      icon={<Settings className="w-[24px] h-[24px]" />}
                      title={t("Configurar WhatsApp")}
                      to="/integrations/whatsapp/new"
                      disabled={hasConnectedWhatsApp}
                      disabledReason={t(
                        "Solo se puede conectar un número de WhatsApp por organización.",
                      )}
                    />
                  )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
