import { Dropdown, message, type MenuProps } from "antd";
import useBoundStore from "@/stores/useBoundStore";
import { type MessageRow } from "@/supabase/client";
import { isArchived } from "@/stores/uiSlice";
import { useTranslation } from "@/hooks/useTranslation";
import {
  assignConversationToMe,
  unassignConversationFromMe,
  updateConvExtra,
} from "@/utils/ConversationUtils";
import { useCurrentAgent } from "@/queries/useAgents";

export default function ItemActions({
  children,
  itemId,
  trigger,
  visible,
}: {
  children: React.ReactNode;
  itemId: string;
  trigger: ("contextMenu" | "click" | "hover")[] | undefined;
  visible?: boolean;
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

  if (!conversation) {
    return children;
  }

  const isPinned = conversation.extra?.pinned;
  const isUnassigned = conversation.assigned_agent_id === null;
  const isAssignedToMe = conversation.assigned_agent_id === currentAgent.data?.id;

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

  const assignmentItems: MenuProps["items"] = [
    ...(isUnassigned && currentAgent.data
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
    ...(isAssignedToMe
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

  const items: MenuProps["items"] = [
    ...assignmentItems,
    ...(assignmentItems.length ? [{ type: "divider" as const }] : []),
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
    /*{
      label: t("Marcar como no leído"),
      key: "2",
      disabled: true,
    },*/
  ];

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
