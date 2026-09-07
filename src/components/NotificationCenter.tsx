import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  AtSign,
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
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

function NotificationIcon({ type }: { type: string }) {
  const className = "h-[18px] w-[18px]";
  switch (type) {
    case "private_note_mention":
      return <AtSign className={className} />;
    case "conversation_transferred_to_agent":
      return <ArrowLeftRight className={className} />;
    case "conversation_transferred_to_queue":
      return <UsersRound className={className} />;
    default:
      return <UserRoundCheck className={className} />;
  }
}

function relativeTime(timestamp: string, t: (key: string) => string) {
  const created = dayjs(timestamp);
  const minutes = Math.max(1, dayjs().diff(created, "minute"));
  if (minutes < 60) return `${minutes} ${t("min")}`;
  const hours = dayjs().diff(created, "hour");
  if (hours < 24) return `${hours} ${t("h")}`;
  if (hours < 48) return t("Ayer");
  return created.format("DD MMM");
}

export default function NotificationCenter() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
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

  useEffect(() => setPage(1), [unreadOnly]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

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
    <>
      <button
        type="button"
        aria-label={t("Notificaciones")}
        title={t("Notificaciones")}
        onClick={() => setOpen(true)}
        className="relative flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Bell className="h-[21px] w-[21px]" />
        {unreadCount > 0 && (
          <span className="absolute right-[1px] top-0 min-w-[17px] rounded-full bg-primary px-[4px] text-center text-[10px] font-bold leading-[17px] text-primary-foreground ring-2 ring-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            aria-label={t("Cerrar")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/45"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label={t("Notificaciones")}
            className="fixed inset-y-0 right-0 flex w-full max-w-[430px] flex-col border-l border-border bg-background text-foreground shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-border px-[22px] py-[20px]">
              <div>
                <h2 className="text-[20px] font-semibold leading-tight">
                  {t("Notificaciones")}
                </h2>
                <p className="mt-[5px] text-[12px] font-medium text-primary">
                  {unreadCount} {t("sin leer")}
                </p>
              </div>
              <div className="flex items-center gap-[14px]">
                <button
                  type="button"
                  disabled={unreadCount === 0 || markAllRead.isPending}
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-[6px] text-[12px] font-medium text-muted-foreground hover:text-primary disabled:opacity-40"
                >
                  <CheckCheck className="h-[16px] w-[16px]" />
                  {t("Marcar todo como leído")}
                </button>
                <button
                  type="button"
                  aria-label={t("Cerrar")}
                  onClick={() => setOpen(false)}
                  className="rounded-md p-[5px] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-[20px] w-[20px]" />
                </button>
              </div>
            </header>

            <div className="grid grid-cols-2 border-b border-border px-[22px] pt-[10px]">
              {[false, true].map((onlyUnread) => (
                <button
                  key={String(onlyUnread)}
                  type="button"
                  onClick={() => setUnreadOnly(onlyUnread)}
                  className={`border-b-2 px-[12px] py-[10px] text-[13px] font-medium ${
                    unreadOnly === onlyUnread
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {onlyUnread ? t("Sin leer") : t("Todas")}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <h3 className="border-b border-border px-[22px] py-[14px] text-[12px] font-semibold text-muted-foreground">
                {t("Actividad reciente")}
              </h3>
              {isLoading ? (
                <p className="p-[32px] text-center text-[13px] text-muted-foreground">
                  {t("Cargando notificaciones...")}
                </p>
              ) : isError ? (
                <p className="p-[32px] text-center text-[13px] text-destructive">
                  {t("No se pudieron cargar las notificaciones")}
                </p>
              ) : !data?.rows.length ? (
                <p className="p-[32px] text-center text-[13px] text-muted-foreground">
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
                      className={`group flex w-full items-start gap-[13px] border-b border-border px-[22px] py-[16px] text-left hover:bg-muted/60 ${
                        notification.read_at ? "" : "bg-primary/[0.06]"
                      }`}
                    >
                      <span className="mt-[1px] flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <NotificationIcon
                          type={notification.notification_type}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold leading-[19px]">
                          {notificationCopy(notification, actorName, t)}
                        </span>
                        {typeof payload.text === "string" && payload.text && (
                          <span className="mt-[3px] line-clamp-2 block text-[12px] leading-[18px] text-muted-foreground">
                            {payload.text}
                          </span>
                        )}
                        <span className="mt-[6px] block text-[11px] text-muted-foreground">
                          {relativeTime(notification.created_at, t)}
                        </span>
                      </span>
                      {!notification.read_at && (
                        <span className="mt-[9px] h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
                      )}
                      <ChevronRight className="mt-[7px] h-[16px] w-[16px] shrink-0 text-muted-foreground group-hover:text-primary" />
                    </button>
                  );
                })
              )}
            </div>

            {pageCount > 1 && (
              <footer className="flex items-center justify-end gap-[9px] border-t border-border px-[22px] py-[13px] text-[12px]">
                <button
                  type="button"
                  aria-label={t("Página anterior")}
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="rounded-md border border-border p-[6px] hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="h-[15px] w-[15px]" />
                </button>
                <span>
                  {page} / {pageCount}
                </span>
                <button
                  type="button"
                  aria-label={t("Página siguiente")}
                  disabled={page >= pageCount}
                  onClick={() => setPage((value) => value + 1)}
                  className="rounded-md border border-border p-[6px] hover:bg-muted disabled:opacity-40"
                >
                  <ChevronRight className="h-[15px] w-[15px]" />
                </button>
              </footer>
            )}
          </section>
        </div>
      )}
    </>
  );
}
