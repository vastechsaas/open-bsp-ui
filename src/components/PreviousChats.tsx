import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Modal } from "antd";
import { History } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import useBoundStore from "@/stores/useBoundStore";
import { supabase, type MessageRow } from "@/supabase/client";
import {
  HISTORY_PAGE_SIZE,
  nextHistoryCursor,
  olderMessagesFilter,
  type HistoryCursor,
} from "@/utils/ConversationHistoryUtils";
import Message from "./Message/Message";
import DataTablePagination from "./DataTablePagination";

export default function PreviousChats({
  conversationId,
}: {
  conversationId: string;
}) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  return orgId && userId ? (
    <PreviousChatsDialog
      key={`${userId}:${orgId}:${conversationId}`}
      orgId={orgId}
      userId={userId}
      conversationId={conversationId}
    />
  ) : null;
}

function PreviousChatsDialog({
  orgId,
  userId,
  conversationId,
}: {
  orgId: string;
  userId: string;
  conversationId: string;
}) {
  const { translate: t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<string>();
  const chats = useQuery({
    queryKey: ["previous-chats", userId, orgId, conversationId, page, pageSize],
    enabled: open,
    refetchInterval: open ? 30_000 : false,
    gcTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .rpc("list_previous_conversations_page", {
          p_organization_id: orgId,
          p_conversation_id: conversationId,
          p_page: page,
          p_page_size: pageSize,
        })
        .abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });
  const history = useInfiniteQuery({
    queryKey: ["previous-chat-history", userId, orgId, selected],
    enabled: open && !!selected,
    refetchInterval: open ? 30_000 : false,
    gcTime: 0,
    retry: false,
    initialPageParam: undefined as HistoryCursor | undefined,
    queryFn: async ({ signal, pageParam }) => {
      const { data: allowed, error: accessError } = await supabase
        .from("conversations")
        .select("id")
        .eq("organization_id", orgId)
        .eq("id", selected!)
        .abortSignal(signal)
        .maybeSingle();
      if (accessError) throw accessError;
      if (!allowed) throw new Error("Conversation is no longer accessible");
      let query = supabase
        .from("messages")
        .select()
        .eq("organization_id", orgId)
        .eq("conversation_id", selected!)
        .order("timestamp", { ascending: false })
        .order("id", { ascending: false })
        .limit(HISTORY_PAGE_SIZE)
        .abortSignal(signal);
      if (pageParam) query = query.or(olderMessagesFilter(pageParam));
      const { data, error } = await query;
      if (error) throw error;
      return data as MessageRow[];
    },
    getNextPageParam: nextHistoryCursor,
  });
  const messages = Array.from(
    new Map(
      history.data?.pages.flat().map((message) => [message.id, message]),
    ).values(),
  ).sort(
    (a, b) =>
      a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id),
  );
  return (
    <>
      <button
        type="button"
        className="m-4 flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
        onClick={() => setOpen(true)}
      >
        <History className="h-4 w-4" />
        {t("Chats anteriores")}
      </button>
      <Modal
        open={open}
        onCancel={() => {
          setOpen(false);
          setSelected(undefined);
        }}
        title={t("Chats anteriores")}
        footer={null}
        width={760}
        destroyOnHidden
      >
        {selected ? (
          <>
            <button
              type="button"
              className="mb-3 text-primary underline"
              onClick={() => setSelected(undefined)}
            >
              {t("Volver a la lista")}
            </button>
            <p className="mb-3 text-muted-foreground">
              {t("Esta conversación es historial de solo lectura")}
            </p>
            <div
              className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-background p-3"
              aria-label={t("Historial de conversación")}
            >
              {history.isPending && <p role="status">{t("Cargando…")}</p>}
              {history.isError && (
                <p role="alert">
                  {t("No se pudo cargar el historial")}{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() =>
                      void (history.isFetchNextPageError
                        ? history.fetchNextPage()
                        : history.refetch())
                    }
                  >
                    {t("Reintentar")}
                  </button>
                </p>
              )}
              {history.hasNextPage && (
                <button
                  type="button"
                  className="mb-3 text-primary underline"
                  disabled={history.isFetchingNextPage}
                  onClick={() => void history.fetchNextPage()}
                >
                  {history.isFetchingNextPage
                    ? t("Cargando…")
                    : t("Cargar mensajes anteriores")}
                </button>
              )}
              {!history.isPending &&
                !history.hasNextPage &&
                !history.isError && (
                  <p className="mb-3 text-center text-muted-foreground">
                    {t("Inicio de la conversación")}
                  </p>
                )}
              {!history.isError &&
                messages.map((message) => (
                  <div className="mb-2 flex flex-col" key={message.id}>
                    <time className="text-xs text-muted-foreground">
                      {new Date(message.timestamp).toLocaleString()}
                    </time>
                    <Message message={message} first last />
                  </div>
                ))}
            </div>
          </>
        ) : (
          <>
            {chats.isPending && <p role="status">{t("Cargando…")}</p>}
            {chats.isError && (
              <p role="alert">
                {t("No se pudieron cargar los chats anteriores")}{" "}
                <button
                  className="underline"
                  type="button"
                  onClick={() => void chats.refetch()}
                >
                  {t("Reintentar")}
                </button>
              </p>
            )}
            {chats.data?.length === 0 && (
              <p>{t("No hay chats anteriores accesibles")}</p>
            )}
            <ul className="mb-4 divide-y divide-border">
              {!chats.isError &&
                chats.data?.map((chat) => (
                  <li key={chat.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left hover:bg-muted"
                      onClick={() => setSelected(chat.id)}
                    >
                      <span>
                        {chat.name || t("Conversación")}
                        <span className="block text-xs text-muted-foreground">
                          {new Date(chat.created_at).toLocaleString()}
                        </span>
                      </span>
                      <span>
                        {chat.status === "closed" ? t("Cerrado") : t("Abierto")}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
            <DataTablePagination
              page={page}
              pageSize={pageSize}
              total={Number(chats.data?.[0]?.total_count ?? 0)}
              disabled={chats.isFetching}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}
      </Modal>
    </>
  );
}
