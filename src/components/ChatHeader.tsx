import { formatPhoneNumber, nameInitials } from "@/utils/FormatUtils";
import Avatar from "./Avatar";
import useBoundStore from "@/stores/useBoundStore";
import { useTranslation } from "@/hooks/useTranslation";
import { ArrowLeft, Check, ChevronDown, ContactRound } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useContactByAddress } from "@/queries/useContacts";
import { useContactAddress } from "@/queries/useContactsAddresses";
import type { InstagramContactAddressExtra } from "@/supabase/client";
import { useCurrentAgent, useCurrentAgents } from "@/queries/useAgents";
import {
  canManageConversationAssignments,
  getConversationAssigneeName,
} from "@/utils/AssignmentUtils";
import AssignConversationButton from "./AssignConversationButton";
import ConversationAssignmentBadge from "./ConversationAssignmentBadge";
import ItemActions from "./ItemActions";

export default function Header({
  customerDetailsOpen = false,
  onToggleCustomerDetails,
}: {
  customerDetailsOpen?: boolean;
  onToggleCustomerDetails?: () => void;
}) {
  const navigate = useNavigate();

  const activeConvId = useBoundStore((state) => state.ui.activeConvId);

  const conversation = useBoundStore((state) =>
    state.chat.conversations.get(state.ui.activeConvId || ""),
  );

  const { data: contact } = useContactByAddress(conversation?.contact_address);
  const { data: contactAddress } = useContactAddress(
    conversation?.contact_address,
  );
  const { data: agents } = useCurrentAgents();
  const { data: currentAgent } = useCurrentAgent();

  const service = conversation?.service;

  const igExtra =
    service === "instagram"
      ? (contactAddress?.extra as InstagramContactAddressExtra | null)
      : null;

  // Name fallback order: conversation.name → contact.name →
  // contactAddress.extra?.name → @username (Instagram) → "?"
  const convName =
    conversation?.name ||
    contact?.name ||
    contactAddress?.extra?.name ||
    (igExtra?.username ? `@${igExtra.username}` : undefined);

  const address = conversation?.contact_address;

  // When there is no name, show the (formatted) contact address instead of "?".
  // WhatsApp addresses are phone numbers; Instagram addresses need no formatting.
  const displayName =
    convName ||
    (address
      ? service === "whatsapp"
        ? formatPhoneNumber(address)
        : address
      : "?");

  const convInitials = nameInitials(convName || "?");
  const { translate: t } = useTranslation();

  const assigneeName = getConversationAssigneeName(conversation, agents);
  const isAssignmentManager = canManageConversationAssignments(
    currentAgent?.extra?.role,
  );
  const isPendingAgent =
    currentAgent?.extra?.role === "agent" &&
    conversation?.assigned_agent_id === null;
  const isAssignedAgent =
    currentAgent?.extra?.role === "agent" &&
    conversation?.assigned_agent_id === currentAgent.id;
  const currentAssignee = agents?.find(
    (agent) => agent.id === conversation?.assigned_agent_id,
  );
  const managerCanManageAssignment =
    isAssignmentManager &&
    (!conversation?.assigned_agent_id ||
      (!currentAssignee?.ai && currentAssignee?.extra?.role === "agent"));

  const subtitleParts = [
    service === "local" && t("Contacto de prueba"),
    service === "whatsapp" && address && formatPhoneNumber(address),
    service === "instagram" && igExtra?.username && `@${igExtra.username}`,
    !isAssignmentManager &&
      assigneeName &&
      `${t("Asignado a")} ${assigneeName}`,
  ].filter(Boolean);

  if (!activeConvId) {
    return null;
  }

  return (
    <div className="header border-b border-border bg-background z-30 shadow-md">
      {/* Back button */}
      <button
        className="mr-4 md:hidden"
        title={t("Volver")}
        onClick={() => navigate({ hash: undefined })}
      >
        <ArrowLeft className="w-[24px] h-[24px] text-foreground" />
      </button>

      {/* Contact info */}
      <div className="profile-picture pr-[15px]">
        <Avatar
          src={igExtra?.profile_picture_url}
          fallback={convInitials}
          size={40}
          className="bg-accent text-accent-foreground border border-border text-[16px]"
        />
      </div>
      <div className="info flex min-w-0 grow flex-col justify-center mr-[12px] truncate">
        <div className="text-[16px] text-foreground truncate">
          {displayName}
        </div>
        <div className="text-[13px] text-muted-foreground truncate">
          {subtitleParts.join(" · ")}
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {onToggleCustomerDetails && (
          <button
            type="button"
            onClick={onToggleCustomerDetails}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
              customerDetailsOpen
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-muted/70 text-foreground hover:bg-accent"
            }`}
            title={t("Ver detalles del cliente")}
            aria-label={t("Ver detalles del cliente")}
            aria-expanded={customerDetailsOpen}
          >
            <ContactRound className="h-4 w-4" aria-hidden />
          </button>
        )}
        {isPendingAgent && (
          <AssignConversationButton
            conversationId={activeConvId}
            className="hidden md:inline-flex"
          />
        )}
        {isAssignedAgent && (
          <ItemActions itemId={activeConvId} trigger={["click"]} assignmentOnly>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-muted/70 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              title={t("Asignada a mí")}
              aria-label={`${t("Asignada a mí")}. ${t("Desasignar")}`}
            >
              <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="hidden sm:inline">{t("Asignada a mí")}</span>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
          </ItemActions>
        )}
        {isAssignmentManager &&
          conversation &&
          (managerCanManageAssignment ? (
            <ItemActions
              itemId={activeConvId}
              trigger={["click"]}
              assignmentOnly
            >
              <ConversationAssignmentBadge
                conversation={conversation}
                agents={agents}
                interactive
                className="max-w-[190px]"
              />
            </ItemActions>
          ) : (
            <ConversationAssignmentBadge
              conversation={conversation}
              agents={agents}
              className="max-w-[190px]"
            />
          ))}
      </div>

      {/* Options button - Hidden, does nothing yet. */}
      <div className="options flex justify-end w-full hidden">
        <button className="p-[8px] ml-[10px] rounded-full active:bg-gray-icon-bg">
          <svg className="w-[24px] h-[24px] text-foreground">
            <use href="/icons.svg#options" />
          </svg>
        </button>
      </div>
    </div>
  );
}
