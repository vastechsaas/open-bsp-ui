import { Dropdown, message, type MenuProps } from "antd";
import useBoundStore from "@/stores/useBoundStore";
import { type MessageRow } from "@/supabase/client";
import { isArchived } from "@/stores/uiSlice";
import { useTranslation } from "@/hooks/useTranslation";
import {
  assignConversationToMe,
  setConversationAgentAssignment,
  unassignConversationFromMe,
  updateConvExtra,
} from "@/utils/ConversationUtils";
import { useCurrentAgent, useCurrentAgents } from "@/queries/useAgents";
import { getConversationAssignmentAction } from "@/utils/AssignmentUtils";

export default function ItemActions({
  children,
  itemId,
  trigger,
  visible,
  assignmentOnly = false,
}: {
  children: React.ReactNode;
  itemId: string;
  trigger: ("contextMenu" | "click" | "hover")[] | undefined;
  visible?: boolean;
  assignmentOnly?: boolean;
}) {
  const conversation = useBoundStore((state) =>
    state.chat.conversations.get(itemId || ""),
  );
  const mostRecentMsg: MessageRow | undefined = useBoundStore(
    (state) =>
      state.chat.messages
        .get(itemId || "")
        ?.values()
        .next().value,
  );

  const { translate: t } = useTranslation();
  const currentAgent = useCurrentAgent();
  const organizationAgents = useCurrentAgents();

  if (!conversation) {
    return children;
  }

  const isPinned = conversation.extra?.pinned;
  const assignmentAction = getConversationAssignmentAction(
    conversation,
    currentAgent.data?.id,
  );

  const isPaused =
    +new Date(conversation.extra?.paused || 0) >
    +new Date() - 12 * 60 * 60 * 1000; // Less than 12 hours ago.

  const handleAssignToMe = async () => {
    try {
      await assignConversationToMe(conversation.id);
      void message.success(t("Conversación asignada"));
    } catch {
      void message.error(t("No se pudo actualizar la asignación"));
    }
  };

  const handleUnassignFromMe = async () => {
    try {
      await unassignConversationFromMe(conversation.id);
      void message.success(t("Conversación desasignada"));
    } catch {
      void message.error(t("No se pudo actualizar la asignación"));
    }
  };

  const handleSetAgentAssignment = async (agentId: string | null) => {
    try {
      await setConversationAgentAssignment(conversation.id, agentId);
      void message.success(
        t(agentId ? "Conversación asignada" : "Conversación desasignada"),
      );
    } catch {
      void message.error(t("No se pudo actualizar la asignación"));
    }
  };

  const assignmentItems: MenuProps["items"] = [
    ...(assignmentAction === "assign-to-me"
      ? [
          {
            label: t("Asignarme"),
            key: "assign-to-me",
            onClick: () => {
              void handleAssignToMe();
            },
          },
        ]
      : []),
    ...(assignmentAction === "unassign-from-me"
      ? [
          {
            label: t("Desasignar"),
            key: "unassign-from-me",
            onClick: () => {
              void handleUnassignFromMe();
            },
          },
        ]
      : []),
  ];

  const acceptedAgents = (organizationAgents.data || []).filter((agent) => {
    if (agent.ai || agent.extra?.role !== "agent") return false;
    return (
      !agent.extra.invitation || agent.extra.invitation.status === "accepted"
    );
  });
  const currentAssignee = organizationAgents.data?.find(
    (agent) => agent.id === conversation.assigned_agent_id,
  );
  const currentAssigneeIsAgent =
    currentAssignee &&
    !currentAssignee.ai &&
    currentAssignee.extra?.role === "agent";
  const canManageAgentAssignment =
    currentAgent.data?.extra?.role === "supervisor" &&
    (!conversation.assigned_agent_id || currentAssigneeIsAgent);

  if (canManageAgentAssignment) {
    assignmentItems.push({
      key: "manage-agent-assignment",
      label: t("Asignar agente"),
      children: [
        ...(conversation.assigned_agent_id
          ? [
              {
                key: "unassign-agent",
                label: t("Sin asignar"),
                onClick: () => {
                  void handleSetAgentAssignment(null);
                },
              },
              { type: "divider" as const },
            ]
          : []),
        ...acceptedAgents.map((agent) => ({
          key: `assign-agent-${agent.id}`,
          label: agent.name,
          disabled: agent.id === conversation.assigned_agent_id,
          onClick: () => {
            void handleSetAgentAssignment(agent.id);
          },
        })),
      ],
    });
  }

  const supervisorAssignmentItems: MenuProps["items"] = [];
  if (canManageAgentAssignment) {
    if (conversation.assigned_agent_id) {
      supervisorAssignmentItems.push(
        {
          key: "unassign-agent-only",
          label: t("Sin asignar"),
          onClick: () => void handleSetAgentAssignment(null),
        },
        { type: "divider" },
      );
    }

    supervisorAssignmentItems.push(
      ...acceptedAgents.map((agent) => ({
        key: `assign-agent-only-${agent.id}`,
        label: agent.name,
        disabled: agent.id === conversation.assigned_agent_id,
        onClick: () => void handleSetAgentAssignment(agent.id),
      })),
    );
  }

  const isPendingAgent =
    currentAgent.data?.extra?.role === "agent" &&
    conversation.assigned_agent_id === null;
  const conversationMutationItems: MenuProps["items"] = isPendingAgent
    ? []
    : [
        {
          label: isPaused ? t("Reanudar asistente") : t("Pausar asistente"),
          key: "0",
          onClick: () =>
            updateConvExtra(conversation, {
              paused: isPaused ? null : new Date().toISOString(),
            }),
        },
        {
          label: isArchived(conversation, mostRecentMsg)
            ? t("Desarchivar chat")
            : t("Archivar chat"),
          key: "1",
          onClick: () =>
            updateConvExtra(conversation, {
              archived: isArchived(conversation, mostRecentMsg)
                ? null
                : new Date().toISOString(),
            }),
        },
        {
          label: isPinned ? t("Desfijar chat") : t("Fijar chat"),
          key: "2",
          onClick: () =>
            updateConvExtra(conversation, {
              pinned: isPinned ? null : new Date().toISOString(),
            }),
        },
      ];

  const items: MenuProps["items"] = assignmentOnly
    ? supervisorAssignmentItems
    : [
        ...assignmentItems,
        ...(assignmentItems.length && conversationMutationItems.length
          ? [{ type: "divider" as const }]
          : []),
        ...conversationMutationItems,
        /*{
          label: t("Marcar como no leído"),
          key: "2",
          disabled: true,
        },*/
      ];

  if (!items.length) {
    return children;
  }

  return (
    <Dropdown
      menu={{ items }}
      trigger={trigger}
      className={`${visible || visible == undefined ? "visible" : "hidden"} rounded-none`}
    >
      {children}
    </Dropdown>
  );
}
