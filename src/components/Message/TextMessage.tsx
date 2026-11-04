import type { MessageRow, OutgoingStatus } from "@/supabase/client";
import type { Json } from "@/supabase/db_types";
import { useTranslation } from "@/hooks/useTranslation";
import dayjs from "dayjs";
import { ExternalLink, MessageCircleReply, Phone } from "lucide-react";
import { prettyPrintJson } from "pretty-print-json";
import { renderChatMarkdown } from "@/utils/ChatMarkdown";
import { type FormEventHandler, useState } from "react";
import StatusIcon from "./StatusIcon";

export type MessageActionButton = {
  text: string;
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
};

export function Markdown({
  content,
  direction,
  onInput,
  withoutEndingSpace,
}: {
  content: string;
  direction: MessageRow["direction"];
  onInput?: FormEventHandler<HTMLDivElement>;
  withoutEndingSpace?: boolean;
}) {
  if (!withoutEndingSpace) {
    content += "&emsp;&emsp;&emsp;";
    if (direction === "outgoing") content += "&emsp;";
  }

  return (
    <div
      className="markdown"
      dangerouslySetInnerHTML={{
        __html: renderChatMarkdown(content),
      }}
      onInput={onInput}
    />
  );
}

export function TextMessage({
  header,
  messageHeader,
  mediaHeaderLabel,
  body,
  footer,
  buttons,
  timestamp,
  status,
  onInput,
  direction,
  type,
  fixedWidth,
}: {
  header?: string;
  messageHeader?: string;
  mediaHeaderLabel?: string;
  body: string | Json;
  footer?: string;
  buttons?: Array<string | MessageActionButton>;
  timestamp?: string;
  status?: OutgoingStatus;
  onInput?: FormEventHandler<HTMLDivElement>;
  direction: MessageRow["direction"];
  type?: "markdown" | "json";
  fixedWidth?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { translate: t } = useTranslation();
  const maxLength = 500;
  const isTooLong =
    type === "json"
      ? JSON.stringify(body).length > maxLength
      : (body as string).length > maxLength;

  return (
    <>
      <div className="relative">
        <div
          className={
            "pl-[6px] pt-[6px] pb-[5px] pr-[4px]" +
            (fixedWidth ? " w-[320px] max-w-full" : "")
          }
        >
          {header && (
            <div
              className="mb-3 text-[15px] font-semibold"
              dangerouslySetInnerHTML={{ __html: header }}
              onInput={onInput}
            />
          )}

          {messageHeader && (
            <div className="mb-2 text-[15px] font-semibold">
              <Markdown
                content={messageHeader}
                direction={direction}
                withoutEndingSpace
              />
            </div>
          )}

          {mediaHeaderLabel && (
            <div className="mb-2 rounded-lg bg-black/5 px-3 py-4 text-center text-xs text-muted-foreground dark:bg-white/5">
              {mediaHeaderLabel}
            </div>
          )}

          {type === "json" ? (
            <>
              <div
                className={
                  "scrollbar-hide overflow-x-auto " +
                  (isTooLong && !expanded
                    ? "max-h-[150px] overflow-y-hidden"
                    : "")
                }
              >
                <pre
                  dangerouslySetInnerHTML={{
                    __html: prettyPrintJson.toHtml(body as Json, { indent: 2 }),
                  }}
                />
              </div>
              {!!footer && (
                <span className="invisible mx-[4px] text-[11px]">
                  {dayjs(timestamp).format("HH:mm")}
                  {direction === "outgoing" && (
                    <span className="ml-[3px] px-[8px]"></span>
                  )}
                </span>
              )}
            </>
          ) : (
            <div
              className={
                "scrollbar-hide overflow-x-auto " +
                (isTooLong && !expanded
                  ? "max-h-[150px] overflow-y-hidden"
                  : "")
              }
            >
              <Markdown
                content={body as string}
                direction={direction}
                onInput={onInput}
                withoutEndingSpace={!!footer}
              />
            </div>
          )}

          {isTooLong && (
            <button
              type="button"
              className="mt-1 text-primary"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? t("ver menos...") : t("ver mÃ¡s...")}
            </button>
          )}

          {footer && (
            <div className="mt-1 text-[13px] text-muted-foreground">
              <Markdown
                content={footer}
                direction={direction}
                withoutEndingSpace
              />
              <span className="invisible mx-[4px] text-[11px]">
                {dayjs(timestamp).format("HH:mm")}
                {direction === "outgoing" && !!status && (
                  <span className="ml-[3px] px-[8px]"></span>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 right-[7px] flex items-center text-[11px] text-muted-foreground">
          {dayjs(timestamp).format("HH:mm")}
          {direction === "outgoing" && !!status && <StatusIcon {...status} />}
        </div>
      </div>

      {buttons?.map((button, index) => {
        const action =
          typeof button === "string"
            ? { text: button, type: "QUICK_REPLY" as const }
            : button;
        return (
          <div
            key={`${action.type}:${action.text}:${index}`}
            aria-disabled="true"
            className="flex items-center justify-center gap-[7px] border-t border-border py-3 text-center text-primary"
          >
            {action.type === "URL" ? (
              <ExternalLink className="h-[14px] w-[14px]" />
            ) : action.type === "PHONE_NUMBER" ? (
              <Phone className="h-[14px] w-[14px]" />
            ) : (
              <MessageCircleReply className="h-[14px] w-[14px]" />
            )}
            {action.text}
          </div>
        );
      })}
    </>
  );
}
