import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgents } from "@/queries/useAgents";
import {
  type UserNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsPage,
  useUnreadNotificationCount,
} from "@/queries/useNotifications";

const PAGE_SIZE = 10;

function notificationCopy(
  notification: UserNotification,
  actorName: string,
  t: (key: string) => string,
) {
  const payload = notification.payload as unknown as Record<string, unknown>;
  const destinationQueue =
    typeof payload.to_queue_name === "string"
      ? payload.to_queue_name
      : t("tu cola");

  switch (notification.notification_type) {
    case "conversation_assigned":
      return t("Se te asignó una conversación");
    case "conversation_transferred_to_agent":
      return `${actorName} ${t("te transfirió una conversación")}`;
    case "conversation_transferred_to_queue":
      return `${actorName} ${t("transfirió una conversación a")} ${destinationQueue}`;
    case "private_note_mention":
      return `${actorName} ${t("te mencionó en una nota privada")}`;
    default:
      return t("Nueva actividad en una conversación");
  }
}

export default function NotificationCenter({
  expanded,
}: {
  expanded: boolean;
}) {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data, isLoading, isError } = useNotificationsPage(page, unreadOnly);
  const { data: agents } = useCurrentAgents();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const agentNames = useMemo(
    () => new Map((agents ?? []).map((agent) => [agent.id, agent.name])),
    [agents],
  );

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => setPage(1), [unreadOnly]);

  const openNotification = async (notification: UserNotification) => {
    if (!notification.read_at) await markRead.mutateAsync(notification.id);
    setOpen(false);
    if (notification.conversation_id) {
      await navigate({
        to: "/conversations",
        hash: notification.conversation_id,
      });
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t("Notificaciones")}
        title={expanded ? undefined : t("Notificaciones")}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-[42px] w-full items-center rounded-lg hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
          expanded ? "gap-[10px] px-[10px]" : "justify-center px-[4px]"
        }`}
      >
        <span className="relative shrink-0">
          <Bell className="h-[20px] w-[20px]" />
          {unreadCount > 0 && (
            <span className="absolute -right-[8px] -top-[7px] min-w-[17px] rounded-full bg-primary px-[4px] text-center text-[10px] font-bold leading-[17px] text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </span>
        {expanded && (
          <span className="text-[13px] font-medium">{t("Notificaciones")}</span>
        )}
      </button>

      {open && (
        <section
          aria-label={t("Notificaciones")}
          className={`fixed bottom-[16px] z-[100] flex max-h-[min(620px,calc(100vh-32px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl max-md:left-[16px] ${
            expanded ? "left-[302px]" : "left-[66px]"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border px-[16px] py-[13px]">
            <div>
              <h2 className="text-[16px] font-semibold">
                {t("Notificaciones")}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {unreadCount} {t("sin leer")}
              </p>
            </div>
            <button
              type="button"
              disabled={unreadCount === 0 || markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
              className="flex items-center gap-[6px] text-[12px] font-medium text-primary disabled:opacity-40"
            >
              <CheckCheck className="h-[16px] w-[16px]" />
              {t("Marcar todo como leído")}
            </button>
          </div>

          <div className="flex gap-[6px] border-b border-border px-[14px] py-[9px]">
            {[false, true].map((onlyUnread) => (
              <button
                key={String(onlyUnread)}
                type="button"
                onClick={() => setUnreadOnly(onlyUnread)}
                className={`rounded-full px-[11px] py-[5px] text-[11px] font-medium ${
                  unreadOnly === onlyUnread
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {onlyUnread ? t("Sin leer") : t("Todas")}
              </button>
            ))}
          </div>

          <div className="min-h-[180px] flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="p-[24px] text-center text-[12px] text-muted-foreground">
                {t("Cargando notificaciones...")}
              </p>
            ) : isError ? (
              <p className="p-[24px] text-center text-[12px] text-destructive">
                {t("No se pudieron cargar las notificaciones")}
              </p>
            ) : !data?.rows.length ? (
              <p className="p-[24px] text-center text-[12px] text-muted-foreground">
                {t("No tienes notificaciones")}
              </p>
            ) : (
              data.rows.map((notification) => {
                const actorName = notification.actor_agent_id
                  ? (agentNames.get(notification.actor_agent_id) ??
                    t("Un compañero"))
                  : t("Sistema");
                const payload = notification.payload as unknown as Record<
                  string,
                  unknown
                >;
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => void openNotification(notification)}
                    className={`flex w-full gap-[11px] border-b border-border/70 px-[15px] py-[12px] text-left hover:bg-muted/60 ${
                      notification.read_at ? "" : "bg-primary/5"
                    }`}
                  >
                    <span
                      className={`mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full ${notification.read_at ? "bg-transparent" : "bg-primary"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-medium leading-[18px]">
                        {notificationCopy(notification, actorName, t)}
                      </span>
                      {typeof payload.text === "string" && payload.text && (
                        <span className="mt-[2px] block truncate text-[11px] text-muted-foreground">
                          {payload.text}
                        </span>
                      )}
                      <span className="mt-[4px] block text-[10px] text-muted-foreground">
                        {dayjs(notification.created_at).format(
                          "DD MMM, h:mm A",
                        )}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-end gap-[8px] border-t border-border px-[14px] py-[9px] text-[11px]">
              <button
                type="button"
                aria-label={t("Página anterior")}
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-md border border-border p-[5px] disabled:opacity-40"
              >
                <ChevronLeft className="h-[14px] w-[14px]" />
              </button>
              <span>
                {page} / {pageCount}
              </span>
              <button
                type="button"
                aria-label={t("Página siguiente")}
                disabled={page >= pageCount}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-md border border-border p-[5px] disabled:opacity-40"
              >
                <ChevronRight className="h-[14px] w-[14px]" />
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
