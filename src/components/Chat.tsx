import { useEffect, useLayoutEffect, useRef } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import "dayjs/locale/pt";
import localizedFormat from "dayjs/plugin/localizedFormat";
dayjs.extend(localizedFormat);
import useBoundStore from "@/stores/useBoundStore";
import Message from "./Message/Message";
import { type MessageRow } from "@/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentOrganization } from "@/queries/useOrganizations";
import { useCurrentAgent } from "@/queries/useAgents";
import { AVATAR_COLORS } from "@/utils/colors";
import { useMentionableHumans } from "@/queries/usePrivateNotes";
import { isPrivateNote } from "@/utils/PrivateNoteUtils";
import { useConversationHistory } from "@/queries/useConversationHistory";
import { isNearChatBottom } from "@/utils/ConversationHistoryUtils";

type EnvelopeType = { message: MessageRow; first: boolean; last: boolean };
type SeparatorType = { text: string; first: true; last: true };

function Separator({ text }: { text: string }) {
  // TODO: just a placeholder
  const type: string = "date";

  return (
    <div
      className={
        "flex justify-center mb-[12px]" +
        (type === "unread" ? " py-[5px] bg-incoming-chat-bubble/25" : "")
      }
    >
      {/* unreads has rounded-16px px-22px py-0 but I prefer to keep the date style */}
      <div
        className={
          "px-[12px] pt-[4px] pb-[5px] capitalize text-[12px] bg-incoming-chat-bubble rounded-lg text-foreground" +
          (type === "unread" ? "" : " shadow")
        }
      >
        {text}
      </div>
    </div>
  );
}

export default function Chat() {
  const activeConvId = useBoundStore((store) => store.ui.activeConvId);
  const messages = Array.from(
    useBoundStore((store) =>
      store.chat.messages.get(store.ui.activeConvId || ""),
    )?.values() || [],
  );

  const { data: org } = useCurrentOrganization();
  const orgName = org?.name || "?";

  const convName = useBoundStore(
    (store) =>
      store.chat.conversations.get(store.ui.activeConvId || "")?.name || "?",
  );

  const { data: agent } = useCurrentAgent();
  const activeAgentId = agent?.id;
  const isAdmin = ["admin", "owner"].includes(agent?.extra?.role || "");
  const { data: mentionableHumans = [] } = useMentionableHumans();
  const authorNames = new Map([
    ...mentionableHumans.map((human) => [human.id, human.name] as const),
    ...(agent ? [[agent.id, agent.name] as const] : []),
  ]);

  const scroller = useRef<HTMLDivElement>(null);
  const history = useConversationHistory();
  const nearBottom = useRef(true);
  const opened = useRef(false);
  const previousNewest = useRef<string | undefined>(undefined);
  const anchor = useRef<{ id: string; offset: number } | null>(null);

  const { translate: t, currentLanguage } = useTranslation();

  function formatDate(timestamp: string): string {
    const dayjsTs = dayjs(timestamp).locale(currentLanguage);

    const days = dayjs().diff(dayjsTs.startOf("day"), "day", true);

    if (days < 1) return t("hoy");

    if (days < 2) return t("ayer");

    if (days < 7) return dayjsTs.format("dddd"); // Jueves

    return dayjsTs.format("l"); // 9/9/2024
  }

  function getUniqueAgentIds(messages: MessageRow[] | undefined): Set<string> {
    if (!messages) return new Set();

    const agentIds = new Set<string>();

    for (const message of messages) {
      if (message.agent_id) {
        agentIds.add(message.agent_id);
      }
    }

    return agentIds;
  }

  function assignAgentColors(agentIds: Set<string>): Map<string, string> {
    const colorMap = new Map<string, string>();
    let colorIndex = 0;

    // Ensure consistent color assignment by sorting agent IDs
    const sortedAgentIds = Array.from(agentIds).sort();

    for (const agentId of sortedAgentIds) {
      colorMap.set(agentId, AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]);
      colorIndex++;
    }

    return colorMap;
  }

  const colorMap = assignAgentColors(getUniqueAgentIds(messages));

  function getAgentAvatar(
    agentId: string | null,
  ): { agentId: string; color: string } | undefined {
    // Incoming messages don't have an agent id
    if (!agentId) return undefined;

    // Avatar is not needed for the user
    if (agentId === activeAgentId) return undefined;

    return { agentId, color: colorMap.get(agentId)! };
  }

  function insertDateSeparators(
    chat: MessageRow[],
  ): (EnvelopeType | SeparatorType)[] {
    const _chat = [];

    let prevMsg: EnvelopeType | null = null;

    for (const [_index, env] of chat
      .map(
        (message) => ({ message, first: false, last: false }) as EnvelopeType,
      )
      .entries()) {
      if (!prevMsg) {
        env.first = true;
        env.last = true;
      } else if (
        prevMsg.message.agent_id === env.message.agent_id &&
        prevMsg.message.direction === env.message.direction &&
        prevMsg.message.content.kind === env.message.content.kind
      ) {
        prevMsg.last = false;
        env.last = true;
      } else if (
        prevMsg.message.agent_id !== env.message.agent_id ||
        prevMsg.message.direction !== env.message.direction ||
        prevMsg.message.content.kind !== env.message.content.kind
      ) {
        prevMsg.last = true;
        env.first = true;
        env.last = true;
      }

      if (
        !prevMsg ||
        dayjs(prevMsg.message.timestamp).isBefore(env.message.timestamp, "day")
      ) {
        _chat.push({
          text: formatDate(env.message.timestamp),
          first: true,
          last: true,
        } as SeparatorType);

        if (prevMsg) {
          prevMsg.last = true;
        }

        env.first = true;
      }

      _chat.push(env);

      prevMsg = env;
    }

    return _chat;
  }

  /* Actions that reset the unreads counter
   * ======================================
   *
   *   Inactive conversation
   *   ---------------------
   *   [x] Opening the conversation (conv goes active)
   *   [~] {X new messages} system message, it dissapears when conv goes inactive
   *   [ ] Scroll starts at system message
   *
   *   Active conversations
   *   --------------------
   *   [x] Sending a message
   *   [ ] Scrolling to bottom
   *
   * Scrolling behavior
   * ==================
   *
   * If at bottom, it sticks
   * New outgoing -> goes to bottom
   * New incoming -> stays at place
   *
   * Telegram:
   *   Remembers conv scroll position
   *   Re-activating the conv -> goes to bottom
   */

  useLayoutEffect(() => {
    opened.current = false;
    nearBottom.current = true;
    previousNewest.current = undefined;
    anchor.current = null;
  }, [activeConvId]);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const newest = messages[0];
    if (!opened.current && history.isSuccess && !history.isFetching) {
      element.scrollTop = element.scrollHeight;
      opened.current = true;
    } else if (anchor.current) {
      const target = Array.from(
        element.querySelectorAll<HTMLElement>("[data-message-id]"),
      ).find((row) => row.dataset.messageId === anchor.current?.id);
      if (target)
        element.scrollTop +=
          target.getBoundingClientRect().top -
          element.getBoundingClientRect().top -
          anchor.current.offset;
    } else if (
      opened.current &&
      (nearBottom.current ||
        (newest?.id !== previousNewest.current &&
          newest?.direction === "outgoing" &&
          newest.agent_id === activeAgentId))
    ) {
      element.scrollTop = element.scrollHeight;
    }
    previousNewest.current = newest?.id;
    nearBottom.current = isNearChatBottom(
      element.scrollTop,
      element.scrollHeight,
      element.clientHeight,
    );
    // Preserve an anchor until a prepended page has entered the message store.
    if (
      anchor.current &&
      !history.isFetching &&
      (history.isFetchNextPageError ||
        history.data?.pages.at(-1)?.length === 0 ||
        messages.some(
          (row) => row.id === history.data?.pages.at(-1)?.at(-1)?.id,
        ))
    ) {
      anchor.current = null;
    }
  }, [
    messages,
    history.isSuccess,
    history.isFetching,
    history.isFetchNextPageError,
    history.data,
    activeAgentId,
  ]);

  const loadOlder = () => {
    const element = scroller.current;
    if (
      !element ||
      !opened.current ||
      !history.hasNextPage ||
      history.isFetching ||
      history.isFetchNextPageError
    )
      return;
    const top = element.getBoundingClientRect().top;
    const visible = Array.from(
      element.querySelectorAll<HTMLElement>("[data-message-id]"),
    ).find((row) => row.getBoundingClientRect().bottom > top);
    if (visible)
      anchor.current = {
        id: visible.dataset.messageId!,
        offset: visible.getBoundingClientRect().top - top,
      };
    void history.fetchNextPage({ cancelRefetch: false });
  };

  // Adjust scroll when visual viewport resizes (e.g. mobile keyboard opens)
  useEffect(() => {
    const handleResize = () => {
      if (nearBottom.current) scrollToBottom(false);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  // If the role is not admin, then do not show internal messages (tool calls, etc).
  const envelopesAndSeparators = insertDateSeparators(
    messages
      .filter((m, idx) => {
        if (isPrivateNote(m)) return true;

        if (isAdmin) return true;

        // Hide internal messages for non-admin users
        if (m.direction === "internal") return false;

        // @ts-expect-error draft is deprecated
        if (m.kind === "draft" && idx !== 0) return false;

        return true;
      })
      .reverse(),
  );

  const scrollToBottom = (isSmooth: boolean = true) => {
    if (scroller.current) {
      scroller.current.scrollTo({
        top: scroller.current.scrollHeight,
        behavior: isSmooth ? "smooth" : "instant",
      });
    }
  };

  return (
    activeConvId && (
      <div
        ref={scroller}
        onScroll={(event) => {
          const element = event.currentTarget;
          nearBottom.current = isNearChatBottom(
            element.scrollTop,
            element.scrollHeight,
            element.clientHeight,
          );
          if (element.scrollTop <= 100) loadOlder();
        }}
        className="grow pb-[8px] overflow-y-auto [scrollbar-gutter:stable]"
      >
        <div className="min-h-[12px]" />
        <div className="px-3 py-2 text-center text-xs text-muted-foreground">
          {history.isFetching && t("Cargando mensajes…")}
          {history.isError && (
            <span>
              {t("No se pudo cargar el historial.")}{" "}
              <button
                type="button"
                className="text-primary underline"
                onClick={() => {
                  anchor.current = null;
                  if (history.isFetchNextPageError)
                    void history.fetchNextPage({ cancelRefetch: false });
                  else void history.refetch();
                }}
              >
                {t("Reintentar")}
              </button>
            </span>
          )}
          {history.isSuccess &&
            !history.isFetching &&
            !history.hasNextPage &&
            t("Inicio de la conversación")}
          {history.isSuccess &&
            history.hasNextPage &&
            !history.isFetching &&
            !history.isFetchNextPageError && (
              <button
                type="button"
                className="text-primary underline"
                onClick={loadOlder}
              >
                {t("Cargar mensajes anteriores")}
              </button>
            )}
        </div>
        <div className="flex flex-col">
          {envelopesAndSeparators.map((envOrSep, index) =>
            "message" in envOrSep ? (
              <div
                key={envOrSep.message.id}
                data-message-id={envOrSep.message.id}
              >
                <Message
                  key={envOrSep.message.id}
                  message={envOrSep.message}
                  first={envOrSep.first}
                  last={envOrSep.last}
                  orgName={orgName}
                  convName={convName}
                  avatar={
                    isPrivateNote(envOrSep.message)
                      ? undefined
                      : getAgentAvatar(envOrSep.message.agent_id)
                  }
                  authorName={
                    envOrSep.message.agent_id
                      ? authorNames.get(envOrSep.message.agent_id)
                      : undefined
                  }
                  transferTargetName={
                    isPrivateNote(envOrSep.message) &&
                    envOrSep.message.content.transfer
                      ? authorNames.get(
                          envOrSep.message.content.transfer.to_agent_id,
                        )
                      : undefined
                  }
                />
              </div>
            ) : (
              <Separator key={index} text={envOrSep.text} />
            ),
          )}
        </div>
        {/* (
          <button
            style={{
              width: "42px",
              height: "42px",
              position: "fixed",
              bottom: "75px",
              right: "20px",
              backgroundColor: "#FFFFFF",
              borderRadius: "50%",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
            }}
            onClick={() => scrollToBottom()}
          >
            <ChevronDown className="w-8 h-8 pt-1 text-foreground" />
          </button>
        ) */}
      </div>
    )
  );
}
