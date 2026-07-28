import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Bot,
  CircleAlert,
  FlaskConical,
  List as ListIcon,
  RefreshCw,
  RotateCcw,
  Send,
  UserRound,
  X,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type {
  ChatbotSimulationOption,
  ChatbotSimulationSession,
} from "@/utils/ChatbotSimulationUtils";

export function ChatbotFlowSimulator({
  session,
  pending,
  error,
  onSend,
  onSelect,
  onReset,
  onClose,
}: {
  session: ChatbotSimulationSession;
  pending: boolean;
  error: boolean;
  onSend: (text: string) => void;
  onSelect: (option: ChatbotSimulationOption) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const [input, setInput] = useState("");
  const [openListMessageId, setOpenListMessageId] = useState<string | null>(
    null,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const actionableMessageId = [...session.messages]
    .reverse()
    .find(
      (message) =>
        message.options?.length ||
        message.list?.sections.some((section) => section.options.length > 0),
    )?.id;
  const openListMessage = openListMessageId
    ? session.messages.find((message) => message.id === openListMessageId)
    : undefined;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pending, session.messages]);

  useEffect(() => {
    if (
      openListMessageId &&
      (openListMessageId !== actionableMessageId ||
        pending ||
        session.status !== "waiting")
    ) {
      setOpenListMessageId(null);
    }
  }, [actionableMessageId, openListMessageId, pending, session.status]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = input.trim();
    if (!value || pending || session.status !== "waiting") return;
    setInput("");
    onSend(value);
  };

  return (
    <aside className="absolute inset-y-0 right-0 z-30 flex w-[320px] shrink-0 flex-col border-l border-border bg-card shadow-xl lg:relative lg:z-auto lg:shadow-none">
      <div className="flex items-center gap-[8px] border-b border-border p-[15px]">
        <FlaskConical className="h-[16px] w-[16px] text-primary" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold">{t("Simulador")}</div>
          <div className="text-[10px] text-muted-foreground">
            {t("Entorno local sin envíos")}
          </div>
        </div>
        <button
          type="button"
          title={t("Reiniciar")}
          aria-label={t("Reiniciar")}
          disabled={pending}
          className="flex h-[28px] w-[28px] items-center justify-center rounded-md hover:bg-muted disabled:opacity-50"
          onClick={() => {
            setOpenListMessageId(null);
            onReset();
          }}
        >
          <RotateCcw className="h-[14px] w-[14px]" />
        </button>
        <button
          type="button"
          title={t("Cerrar panel")}
          aria-label={t("Cerrar panel")}
          className="flex h-[28px] w-[28px] items-center justify-center rounded-md hover:bg-muted"
          onClick={() => {
            setOpenListMessageId(null);
            onClose();
          }}
        >
          <X className="h-[15px] w-[15px]" />
        </button>
      </div>

      <div className="border-b border-border bg-primary/5 px-[14px] py-[9px] text-[10px] leading-relaxed text-muted-foreground">
        {t(
          "Usa el flujo actual en memoria. No crea conversaciones, mensajes ni ejecuciones reales.",
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-[13px]">
        {pending && session.messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <RefreshCw className="h-[20px] w-[20px] animate-spin text-primary" />
            <div className="mt-[9px] text-[11px] text-muted-foreground">
              {t("Iniciando simulación…")}
            </div>
          </div>
        )}

        {session.status === "invalid" && (
          <div className="space-y-[8px]">
            <div className="flex items-start gap-[8px] rounded-xl border border-destructive/30 bg-destructive/8 p-[11px] text-destructive">
              <CircleAlert className="mt-[1px] h-[15px] w-[15px] shrink-0" />
              <div className="text-[11px] leading-relaxed">
                {t("Corregí el flujo antes de simularlo.")}
              </div>
            </div>
            {session.issues.map((issue, index) => (
              <div
                key={`${issue.code}:${index}`}
                className="rounded-lg border border-border bg-background/45 p-[10px]"
              >
                <div className="text-[10px] font-semibold text-destructive">
                  {issue.code}
                </div>
                <div className="mt-[3px] text-[11px] leading-relaxed">
                  {issue.message}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-[8px] rounded-xl border border-destructive/30 bg-destructive/8 p-[11px] text-destructive"
          >
            <CircleAlert className="mt-[1px] h-[15px] w-[15px] shrink-0" />
            <div className="text-[11px] leading-relaxed">
              {t("No se pudo continuar la simulación. Intentá reiniciarla.")}
            </div>
          </div>
        )}

        <div className="space-y-[10px]">
          {session.messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-[7px] ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role !== "user" && (
                <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  {message.role === "bot" ? (
                    <Bot className="h-[13px] w-[13px]" />
                  ) : (
                    <CircleAlert className="h-[13px] w-[13px]" />
                  )}
                </div>
              )}
              <div
                className={`max-w-[220px] rounded-xl px-[10px] py-[8px] text-[11px] leading-relaxed ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : message.role === "system"
                      ? "border border-destructive/25 bg-destructive/8 text-destructive"
                      : "border border-border bg-background"
                }`}
              >
                <div>{message.text}</div>
                {message.options && message.options.length > 0 && (
                  <div className="mt-[8px] space-y-[5px] border-t border-border pt-[7px]">
                    {message.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={
                          pending ||
                          session.status !== "waiting" ||
                          message.id !== actionableMessageId
                        }
                        onClick={() => onSelect(option)}
                        className="block w-full rounded-lg border border-primary/35 bg-primary/5 px-[8px] py-[6px] text-left text-primary hover:bg-primary/10 disabled:cursor-default disabled:opacity-55"
                      >
                        <span className="block text-[10px] font-semibold">
                          {option.title}
                        </span>
                        {option.description && (
                          <span className="mt-[2px] block text-[9px] leading-relaxed text-muted-foreground">
                            {option.description}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {message.list && (
                  <button
                    type="button"
                    disabled={
                      pending ||
                      session.status !== "waiting" ||
                      message.id !== actionableMessageId
                    }
                    onClick={() => setOpenListMessageId(message.id)}
                    className="mt-[8px] flex w-full items-center justify-center gap-[6px] border-t border-border pt-[8px] font-semibold text-primary hover:text-primary/80 disabled:cursor-default disabled:opacity-55"
                  >
                    <ListIcon className="h-[12px] w-[12px]" />
                    {message.list.buttonText}
                  </button>
                )}
              </div>
              {message.role === "user" && (
                <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <UserRound className="h-[13px] w-[13px]" />
                </div>
              )}
            </div>
          ))}
          {pending && session.messages.length > 0 && (
            <div className="flex items-center gap-[7px] text-[10px] text-muted-foreground">
              <RefreshCw className="h-[12px] w-[12px] animate-spin" />
              {t("Procesando…")}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {session.status === "completed" && (
        <div className="border-t border-emerald-500/25 bg-emerald-500/8 px-[13px] py-[9px] text-[10px] text-emerald-600 dark:text-emerald-400">
          {t("La simulación terminó correctamente.")}
        </div>
      )}

      {session.status === "handed_off" && (
        <div className="border-t border-violet-500/25 bg-violet-500/8 px-[13px] py-[9px] text-[10px] text-violet-600 dark:text-violet-400">
          {t(
            "La simulación transfirió la conversación sin modificar datos reales.",
          )}
        </div>
      )}

      <form
        className={`gap-[7px] border-t border-border p-[11px] ${
          session.waitingFor === "free_text" ? "flex" : "hidden"
        }`}
        onSubmit={submit}
      >
        <input
          value={input}
          maxLength={4096}
          disabled={
            pending ||
            session.status !== "waiting" ||
            session.waitingFor !== "free_text"
          }
          placeholder={
            session.status === "waiting"
              ? t("Escribí una respuesta")
              : t("Esperando al flujo")
          }
          className="h-[36px] min-w-0 flex-1 rounded-lg border border-border bg-background px-[10px] text-[11px] outline-none focus:border-primary disabled:opacity-55"
          onChange={(event) => setInput(event.target.value)}
        />
        <button
          type="submit"
          title={t("Enviar respuesta")}
          aria-label={t("Enviar respuesta")}
          disabled={pending || session.status !== "waiting" || !input.trim()}
          className="primary flex h-[36px] w-[36px] items-center justify-center disabled:opacity-45"
        >
          <Send className="h-[14px] w-[14px]" />
        </button>
      </form>
      {session.waitingFor !== "free_text" && (
        <div className="border-t border-border px-[12px] py-[10px] text-center text-[10px] text-muted-foreground">
          {session.status === "waiting"
            ? t("Seleccioná una opción para continuar")
            : t("Esperando al flujo")}
        </div>
      )}
      {openListMessage?.list && (
        <div
          className="absolute inset-0 z-40 flex items-end bg-black/45 p-[10px]"
          onClick={() => setOpenListMessageId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={openListMessage.list.buttonText}
            className="max-h-[78%] w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-[8px] border-b border-border px-[13px] py-[11px]">
              <ListIcon className="h-[14px] w-[14px] text-primary" />
              <div className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                {openListMessage.list.buttonText}
              </div>
              <button
                type="button"
                title={t("Cerrar panel")}
                aria-label={t("Cerrar panel")}
                onClick={() => setOpenListMessageId(null)}
                className="flex h-[27px] w-[27px] items-center justify-center rounded-full hover:bg-muted"
              >
                <X className="h-[13px] w-[13px]" />
              </button>
            </div>
            <div className="max-h-[360px] overflow-y-auto p-[9px]">
              {openListMessage.list.sections.map((section, sectionIndex) => (
                <div
                  key={`${openListMessage.id}:section:${sectionIndex}`}
                  className="mb-[9px] last:mb-0"
                >
                  <div className="px-[5px] pb-[4px] text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {section.title}
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border">
                    {section.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setOpenListMessageId(null);
                          onSelect(option);
                        }}
                        className="block w-full border-b border-border px-[11px] py-[9px] text-left last:border-b-0 hover:bg-muted/55"
                      >
                        <span className="block text-[11px] font-medium">
                          {option.title}
                        </span>
                        {option.description && (
                          <span className="mt-[2px] block text-[9px] leading-relaxed text-muted-foreground">
                            {option.description}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
