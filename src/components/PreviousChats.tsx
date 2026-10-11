import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Modal } from "antd";
import { ArrowLeft, ChevronRight, History, LockKeyhole, X } from "lucide-react";
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
  const { translate: t, currentLanguage } = useTranslation();
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(currentLanguage, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
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
        className="m-4 flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        centered
        closable={{ "aria-label": t("Cerrar") }}
        closeIcon={<X className="h-4 w-4 text-foreground" aria-hidden />}
        className="[&_.ant-modal-close]:hover:bg-muted [&_.ant-modal-close]:focus-visible:ring-2 [&_.ant-modal-close]:focus-visible:ring-ring"
        classNames={{
          container:
            "!rounded-2xl !border !border-border !bg-card !p-0 !text-card-foreground shadow-2xl",
          header:
            "!m-0 !border-b !border-border !bg-transparent !px-5 !py-4 !pr-14",
          title: "!text-lg !font-semibold !text-foreground",
          body: "max-h-[80dvh] overflow-y-auto !p-5 text-sm !text-foreground",
        }}
        destroyOnHidden
      >
        {selected ? (
          <>
            <button
              type="button"
              className="mb-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setSelected(undefined)}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("Volver a la lista")}
            </button>
            <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
              <LockKeyhole className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("Esta conversación es historial de solo lectura")}
            </p>
            <div
              className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-background p-3"
              aria-label={t("Historial de conversación")}
            >
              {history.isPending && <p role="status">{t("Cargando…")}</p>}
              {history.isError && (
                <p role="alert">
                  {t("No se pudo cargar el historial.")}{" "}
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
                    <time
                      dateTime={message.timestamp}
                      className="text-xs text-muted-foreground"
                    >
                      {formatDate(message.timestamp)}
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
                      className="flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setSelected(chat.id)}
                    >
                      <span>
                        {chat.name || t("Conversación")}
                        <span className="block text-xs text-muted-foreground">
                          {formatDate(chat.created_at)}
                        </span>
                      </span>
                      <span className="ml-auto shrink-0 rounded-full border border-border bg-muted/70 px-2.5 py-1 text-xs font-medium text-foreground">
                        {chat.status === "closed"
                          ? t("Cerrado")
                          : chat.status === "spam"
                            ? t("Spam")
                            : t("Abierto")}
                      </span>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
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
