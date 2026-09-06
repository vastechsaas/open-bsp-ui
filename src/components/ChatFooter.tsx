import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquareText, Mic, Plus, StickyNote, X } from "lucide-react";
import {
  newMessage,
  pushMessageToDb,
  pushMessageToStore,
} from "@/utils/MessageUtils";
import useBoundStore from "@/stores/useBoundStore";
import { pushConversationToDb, saveDraft } from "@/utils/ConversationUtils";
import { type FileDraft } from "@/stores/chatSlice";
import {
  type Draft,
  type MessageRow,
  type TemplateMessage,
} from "@/supabase/client";
import { TickContext } from "@/contexts/useTick";
import dayjs from "dayjs";
import "dayjs/locale/es";
import "dayjs/locale/pt";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import { useQuickReplyLibrary } from "@/queries/useQuickReplies";
import { moveCursorToEnd } from "@/utils/UtilityFunctions";
import { htmlToMarkdown } from "@/utils/htmlToMarkdown";
import TemplatePicker from "./TemplatePicker";
import AssignConversationButton from "./AssignConversationButton";
import PrivateNoteComposer from "./PrivateNoteComposer";
import {
  canComposePrivateNote,
  canSendCustomerReply,
} from "@/utils/PrivateNoteUtils";
import {
  getQuickReplyKeyboardAction,
  getQuickReplySuggestions,
} from "@/utils/QuickReplyUtils";
import VoiceRecorder from "./VoiceRecorder";

function TemplateVarInput({
  placeholder,
  value,
  onChange,
  onEnter,
  autoFocus,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  autoFocus?: boolean;
}) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number | undefined>();

  useEffect(() => {
    if (measureRef.current) {
      setWidth(measureRef.current.offsetWidth);
    }
  }, [value, placeholder]);

  return (
    <>
      <span
        ref={measureRef}
        className="absolute invisible whitespace-pre text-[14px] px-[12px]"
        aria-hidden
      >
        {value || placeholder}
      </span>
      <input
        type="text"
        className="inline-block bg-primary/10 border border-primary/30 rounded-full px-[12px] py-[1px] mx-[2px] text-[14px] leading-[18px] outline-none focus:border-primary"
        style={{ width: width ? `${width + 4}px` : undefined }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onEnter();
          }
        }}
        autoFocus={autoFocus}
      />
    </>
  );
}

export default function ChatFooter() {
  const activeConvId = useBoundStore((store) => store.ui.activeConvId);
  const conv = useBoundStore((store) =>
    store.chat.conversations.get(store.ui.activeConvId || ""),
  );
  const draft: Draft | null | undefined = conv?.extra?.draft;
  const storedSendAsContact = useBoundStore((store) => store.ui.sendAsContact);
  const setSendAsContact = useBoundStore((store) => store.ui.setSendAsContact);
  const toggle = useBoundStore((store) => store.ui.toggle);
  const templatePicker = useBoundStore((store) => store.ui.templatePicker);
  const privateNoteMode = useBoundStore((store) => store.ui.privateNoteMode);
  const setPrivateNoteMode = useBoundStore(
    (store) => store.ui.setPrivateNoteMode,
  );
  const templateDraftEntry = useBoundStore((store) =>
    store.ui.templateDrafts.get(store.ui.activeConvId || ""),
  );
  const setTemplateDraft = useBoundStore((store) => store.ui.setTemplateDraft);
  const message = useBoundStore((store) =>
    store.chat.textDrafts.get(store.ui.activeConvId || ""),
  );
  const setConversationTextDraft = useBoundStore(
    (store) => store.chat.setConversationTextDraft,
  );
  const setMessage = (message: string) =>
    setConversationTextDraft(activeConvId || "", message);

  const fileDrafts = useBoundStore((store) =>
    store.chat.fileDrafts.get(store.ui.activeConvId || ""),
  );
  const setConversationFileDrafts = useBoundStore(
    (store) => store.chat.setConversationFileDrafts,
  );
  const setFileDrafts = (fileDrafts: FileDraft[]) =>
    setConversationFileDrafts(activeConvId || "", fileDrafts);

  const { data: agent } = useCurrentAgent();
  const agentId = agent?.id;
  const isAgent = agent?.extra?.role === "agent";
  const sendAsContact = !isAgent && storedSendAsContact;
  const customerReplyAllowed = canSendCustomerReply(
    agent?.extra?.role,
    agentId,
    conv?.assigned_agent_id,
  );
  const { data: quickReplies = [] } = useQuickReplyLibrary();
  const quickReplySuggestions = useMemo(
    () => getQuickReplySuggestions(message || "", quickReplies),
    [message, quickReplies],
  );
  const [selectedQuickReplyIndex, setSelectedQuickReplyIndex] = useState(0);
  const [dismissedQuickReplyDraft, setDismissedQuickReplyDraft] = useState<
    string | undefined
  >();

  const [timer, setTimer] = useState<ReturnType<typeof setTimeout>>();
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);

  const editableDiv = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const setMediaLoad = useBoundStore((store) => store.chat.setMediaLoad);

  const { translate: t, currentLanguage } = useTranslation();

  const tick = useContext(TickContext); // one-minute ticks

  const mostRecentIncoming: MessageRow | undefined = useBoundStore((store) => {
    const msgs = store.chat.messages.get(store.ui.activeConvId || "")?.values();

    if (!msgs) {
      return;
    }

    for (const msg of msgs) {
      if (msg.direction === "incoming") {
        return msg;
      }
    }
  });

  // Wether or not the user is allowed to send messages to the client.
  // WhatsApp and Instagram both enforce a 24h customer-service window since the
  // contact's last message; `local` (internal testing) has no window.
  const inCSWindow =
    (conv?.service !== "whatsapp" && conv?.service !== "instagram") ||
    tick.isBefore(dayjs(mostRecentIncoming?.timestamp || 0).add(1, "day"));
  const quickReplyPickerOpen =
    inCSWindow &&
    customerReplyAllowed &&
    !templateDraftEntry?.template &&
    !!message?.startsWith("/") &&
    dismissedQuickReplyDraft !== message &&
    quickReplySuggestions.length > 0;

  useEffect(() => {
    setSelectedQuickReplyIndex(0);
  }, [message, quickReplySuggestions.length]);

  useEffect(() => setVoiceRecorderOpen(false), [activeConvId]);

  // WhatsApp customer service window lasts 24 hours since the last contact's message
  const remaining = tick
    .locale(currentLanguage)
    .to(dayjs(mostRecentIncoming?.timestamp || 0).add(1, "day"), true);

  // Template mode: derive from per-conv store
  const templateDraft = templateDraftEntry?.template;
  const bodyVarValues = templateDraftEntry?.bodyVarValues || [];
  const headVarValues = templateDraftEntry?.headVarValues || [];

  const templateBody = templateDraft?.components.find((c) => c.type === "BODY");
  const templateHead = templateDraft?.components.find(
    (c) => c.type === "HEADER",
  );
  const templateTextHead =
    templateHead?.type === "HEADER" && templateHead.format === "TEXT"
      ? templateHead
      : undefined;
  const templateFoot = templateDraft?.components.find(
    (c) => c.type === "FOOTER",
  );
  const templateButtons = templateDraft?.components.find(
    (c) => c.type === "BUTTONS",
  );

  const bodyExamples = templateBody?.example?.body_text[0] || [];
  const headExamples = templateTextHead?.example?.header_text || [];

  // Count how many variables are in the template body/header
  const bodyVarCount = (templateBody?.text.match(/\{\{\d+\}\}/g) || []).length;
  const headVarCount = (templateTextHead?.text.match(/\{\{\d+\}\}/g) || [])
    .length;

  const allVarsFilled =
    templateDraft &&
    bodyVarValues.slice(0, bodyVarCount).every((v) => v.trim() !== "") &&
    headVarValues.slice(0, headVarCount).every((v) => v.trim() !== "");

  function updateVarValues(bodyVars: string[], headVars: string[]) {
    if (!activeConvId || !templateDraftEntry) return;
    setTemplateDraft(activeConvId, {
      ...templateDraftEntry,
      bodyVarValues: bodyVars,
      headVarValues: headVars,
    });
  }

  useEffect(() => {
    if (!editableDiv.current) {
      return;
    }

    if (!inCSWindow) {
      editableDiv.current.textContent = "";
      return;
    }

    editableDiv.current.textContent = message || "";

    // do not steal the focus from the file previewer
    if (
      !fileDrafts?.length &&
      window.matchMedia("(min-width: 768px)").matches
    ) {
      moveCursorToEnd(editableDiv.current);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId, fileDrafts, privateNoteMode]);

  // Set send as contact
  useEffect(() => {
    if (!activeConvId || !conv) {
      return;
    }

    // Note: conv.extra.draft is a DB stored draft; message (textDraft) is just an UI buffer
    const shouldLoadDraft = inCSWindow && draft?.text && !message; // do not overwrite a current message

    if (draft?.origin === "bot" || draft?.origin === "human-as-organization") {
      // Draft defaults to send as organization
      shouldLoadDraft && setSendAsContact(false);
    } else if (conv.service === "local") {
      // Internal testing service defaults to send as contact
      setSendAsContact(true);
    } else {
      // WhatsApp defaults to send as organization
      setSendAsContact(false);
    }

    if (shouldLoadDraft) {
      clearTimeout(timer);

      setMessage(draft.text);

      if (editableDiv.current) {
        editableDiv.current.textContent = draft.text;
        if (window.matchMedia("(min-width: 768px)").matches) {
          moveCursorToEnd(editableDiv.current);
        }
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId, draft]);

  const sendTextMessage = async () => {
    if (!activeConvId || !conv || !message) {
      return;
    }

    clearTimeout(timer);

    // If the conv has the `updated_at` unset, it means it has not been pushed to the DB yet.
    !conv.updated_at && (await pushConversationToDb(conv));

    const record = newMessage(
      conv,
      sendAsContact ? "incoming" : "outgoing",
      {
        version: "1",
        type: "text",
        kind: "text",
        text: message,
      },
      agentId,
    );

    pushMessageToStore(record);
    await pushMessageToDb(record);

    setMessage("");
    // TODO: optimization: combine with the updateConvExtra call - cabra 2025-01-16
    draft && saveDraft(conv, "", sendAsContact);

    if (editableDiv.current) {
      editableDiv.current.textContent = "";
    }
  };

  const sendVoiceMessage = async (file: File) => {
    if (!conv || !activeConvId || !agentId) return;
    !conv.updated_at && (await pushConversationToDb(conv));
    const record = newMessage(
      conv,
      "outgoing",
      {
        version: "1",
        type: "file",
        kind: "audio",
        file: {
          uri: "",
          mime_type: file.type,
          name: file.name,
          size: file.size,
          voice: true,
        },
        text: "",
      },
      agentId,
      file,
    );
    setMediaLoad(record.id!, { type: "upload", status: "pending", blob: file });
    pushMessageToStore(record);
    setVoiceRecorderOpen(false);
  };

  const selectQuickReply = (index: number) => {
    const reply = quickReplySuggestions[index];
    if (!reply || !activeConvId || !conv) return;

    clearTimeout(timer);
    setMessage(reply.content);
    setDismissedQuickReplyDraft(reply.content);
    setSelectedQuickReplyIndex(0);

    if (conv.created_at !== conv.updated_at) {
      debounce(() => saveDraft(conv, reply.content, sendAsContact), 3000);
    }

    requestAnimationFrame(() => {
      if (!editableDiv.current) return;
      editableDiv.current.textContent = reply.content;
      editableDiv.current.focus();
      moveCursorToEnd(editableDiv.current);
    });
  };

  const sendTemplateMessage = async () => {
    if (!activeConvId || !conv || !templateDraft || !templateBody) {
      return;
    }

    // If the conv has the `updated_at` unset, it means it has not been pushed to the DB yet.
    !conv.updated_at && (await pushConversationToDb(conv));

    // Build rendered text
    let bodyContent = templateBody.text;
    let headContent = templateTextHead?.text;
    const components: TemplateMessage["template"]["components"] = [];

    if (headVarValues.length && headVarCount > 0) {
      let idx = 1;
      for (const value of headVarValues.slice(0, headVarCount)) {
        headContent = headContent?.replaceAll(`{{${idx}}}`, value);
        idx++;
      }
      components.push({
        type: "header",
        parameters: headVarValues.slice(0, headVarCount).map((text) => ({
          type: "text" as const,
          text,
        })),
      });
    }

    if (bodyVarValues.length && bodyVarCount > 0) {
      let idx = 1;
      for (const value of bodyVarValues.slice(0, bodyVarCount)) {
        bodyContent = bodyContent.replaceAll(`{{${idx}}}`, value);
        idx++;
      }
      components.push({
        type: "body",
        parameters: bodyVarValues.slice(0, bodyVarCount).map((text) => ({
          type: "text" as const,
          text,
        })),
      });
    }

    if (templateButtons?.buttons) {
      let idx = 0;
      for (const button of templateButtons.buttons) {
        if (button.type === "QUICK_REPLY") {
          components.push({
            type: "button",
            sub_type: "quick_reply",
            index: idx.toString(),
            parameters: [
              {
                type: "payload",
                payload: button.text.toLowerCase().replaceAll(" ", "_"),
              },
            ],
          });
        }
        idx++;
      }
    }

    const template: TemplateMessage["template"] = {
      name: templateDraft.name,
      language: {
        code: templateDraft.language,
        policy: "deterministic" as const,
      },
    };

    if (components.length) {
      template.components = components;
    }

    // Build rendered text for display
    const renderedParts: string[] = [];
    if (headContent) renderedParts.push(`*${headContent}*`);
    renderedParts.push(bodyContent);
    if (templateFoot?.text) renderedParts.push(`_${templateFoot.text}_`);
    const renderedBody = renderedParts.join("\n\n");

    const record = newMessage(
      conv,
      "outgoing",
      {
        version: "1",
        type: "data",
        kind: "template",
        data: template,
        text: renderedBody,
      },
      agentId,
    );

    pushMessageToStore(record);
    await pushMessageToDb(record);

    setTemplateDraft(activeConvId, null);
  };

  function debounce(fn: () => void, ms: number) {
    clearTimeout(timer);
    setTimer(setTimeout(fn, ms));
  }

  // Render template body with inline inputs for variables
  function renderTemplateBody() {
    if (!templateBody) return null;

    const parts: (string | { varIndex: number; isHeader: boolean })[] = [];

    // Render header if present
    if (templateTextHead?.text && headVarCount > 0) {
      const headerSegments = templateTextHead.text.split(/(\{\{\d+\}\})/);
      let headerIdx = 0;
      for (const seg of headerSegments) {
        const match = seg.match(/^\{\{(\d+)\}\}$/);
        if (match) {
          parts.push({ varIndex: headerIdx, isHeader: true });
          headerIdx++;
        } else if (seg) {
          parts.push(seg);
        }
      }
      parts.push("\n");
    } else if (templateTextHead?.text) {
      parts.push(templateTextHead.text + "\n");
    }

    // Render body
    const segments = templateBody.text.split(/(\{\{\d+\}\})/);
    let bodyIdx = 0;
    for (const seg of segments) {
      const match = seg.match(/^\{\{(\d+)\}\}$/);
      if (match) {
        parts.push({ varIndex: bodyIdx, isHeader: false });
        bodyIdx++;
      } else if (seg) {
        parts.push(seg);
      }
    }

    // Render footer if present
    if (templateFoot?.text) {
      parts.push("\n" + templateFoot.text);
    }

    return (
      <div className="mx-[5px] py-[10px] min-h-[40px] max-h-40 overflow-y-auto text-[15px] leading-[20px] break-words">
        {parts.map((part, i) =>
          typeof part === "string" ? (
            <span key={i}>{part}</span>
          ) : (
            <TemplateVarInput
              key={i}
              placeholder={
                part.isHeader
                  ? headExamples[part.varIndex] || `{{${part.varIndex + 1}}}`
                  : bodyExamples[part.varIndex] || `{{${part.varIndex + 1}}}`
              }
              value={
                part.isHeader
                  ? headVarValues[part.varIndex] || ""
                  : bodyVarValues[part.varIndex] || ""
              }
              onChange={(value) => {
                if (part.isHeader) {
                  const next = [...headVarValues];
                  next[part.varIndex] = value;
                  updateVarValues(bodyVarValues, next);
                } else {
                  const next = [...bodyVarValues];
                  next[part.varIndex] = value;
                  updateVarValues(next, headVarValues);
                }
              }}
              onEnter={() => {
                if (
                  allVarsFilled &&
                  window.matchMedia("(min-width: 768px)").matches
                ) {
                  sendTemplateMessage();
                }
              }}
              autoFocus={i === parts.findIndex((p) => typeof p !== "string")}
            />
          ),
        )}
      </div>
    );
  }

  const composerModeTabs = activeConvId && conv && (
    <div className="mb-2 flex w-fit gap-1 rounded-lg border border-border bg-background/95 p-1 text-[12px] shadow-sm">
      <button
        type="button"
        className={
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors " +
          (!privateNoteMode
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent")
        }
        onClick={() => setPrivateNoteMode(false)}
      >
        <MessageSquareText className="h-3.5 w-3.5" />
        {t("Responder al cliente")}
      </button>
      <button
        type="button"
        className={
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors " +
          (privateNoteMode
            ? "bg-amber-500 text-amber-950"
            : "text-muted-foreground hover:bg-amber-100 dark:hover:bg-amber-950")
        }
        onClick={() => setPrivateNoteMode(true)}
      >
        <StickyNote className="h-3.5 w-3.5" />
        {t("Nota privada")}
      </button>
    </div>
  );

  if (activeConvId && conv && !canComposePrivateNote(conv.status)) {
    return (
      <div className="mx-[12px] mb-[12px] rounded-xl border border-border bg-background/95 px-4 py-3 text-center text-[13px] font-medium text-muted-foreground shadow-sm">
        {t("Esta conversación es historial de solo lectura")}
      </div>
    );
  }

  if (activeConvId && conv && privateNoteMode) {
    return (
      <div className="relative z-10 mx-[12px] mb-[12px] mt-[4px] lg:mt-0">
        {composerModeTabs}
        <PrivateNoteComposer conversationId={activeConvId} />
      </div>
    );
  }

  if (activeConvId && conv && isAgent && !customerReplyAllowed) {
    return (
      <div className="relative z-10 mx-[12px] mb-[12px] mt-[4px] lg:mt-0">
        {composerModeTabs}
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-background/95 px-4 py-3 shadow-sm sm:flex-row">
          <span className="text-center text-[13px] font-medium text-muted-foreground sm:text-left">
            {conv?.assigned_agent_id === null
              ? t("Asígnate esta conversación para responder")
              : t("Solo el agente asignado puede responder al cliente")}
          </span>
          {conv?.assigned_agent_id === null && (
            <AssignConversationButton conversationId={conv.id} />
          )}
        </div>
      </div>
    );
  }

  return (
    activeConvId &&
    conv && (
      <div className="relative mx-[12px] mb-[12px] mt-[4px] lg:mt-[0px] z-10">
        {composerModeTabs}
        {templatePicker && <TemplatePicker />}
        <div
          className={
            "flex items-end text-foreground p-[5px] rounded-[24px] shadow-[0_0_4px_0px_rgba(0,0,0,0.1)]" +
            (templateDraft
              ? " bg-incoming-chat-bubble"
              : !inCSWindow
                ? " bg-background"
                : " bg-incoming-chat-bubble")
          }
        >
          {voiceRecorderOpen ? (
            <VoiceRecorder
              organizationId={conv.organization_id}
              onCancel={() => setVoiceRecorderOpen(false)}
              onSend={(file) => void sendVoiceMessage(file)}
            />
          ) : (
            <>
              <div className="shrink-0">
                {templateDraft ? (
                  <button
                    className="p-[8px] rounded-full cursor-pointer hover:bg-accent"
                    onClick={() => setTemplateDraft(activeConvId, null)}
                    title={t("Descartar plantilla")}
                  >
                    <X className="w-[24px] h-[24px]" />
                  </button>
                ) : (
                  <button
                    disabled={!inCSWindow}
                    className={
                      "p-[8px] rounded-full" +
                      (!inCSWindow ? "" : " cursor-pointer hover:bg-accent")
                    }
                    onClick={() => fileInput.current?.click()}
                    title={t("Adjuntar")}
                  >
                    <Plus className="w-[24px] h-[24px]" />
                  </button>
                )}
              </div>

              <input
                disabled={!inCSWindow}
                ref={fileInput}
                type="file"
                multiple={true}
                className="hidden"
                accept="*/*"
                onChange={(event) => {
                  if (!event.target.files?.length) {
                    return;
                  }

                  const drafts = Array.from(event.target.files).map<FileDraft>(
                    (file) => ({
                      file,
                    }),
                  );

                  drafts[0].caption = message;

                  setFileDrafts(drafts);
                }}
              />

              {/* Text input or template mode */}
              <div className="relative grow">
                {templateDraft ? (
                  renderTemplateBody()
                ) : (
                  <>
                    {quickReplyPickerOpen && (
                      <div
                        role="listbox"
                        aria-label={t("Respuestas rápidas")}
                        className="absolute bottom-full left-0 right-0 z-30 mb-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-background p-1 text-foreground shadow-xl"
                      >
                        {quickReplySuggestions.map((reply, index) => (
                          <button
                            key={reply.id}
                            type="button"
                            role="option"
                            aria-selected={index === selectedQuickReplyIndex}
                            className={`block w-full rounded-lg px-3 py-2 text-left ${
                              index === selectedQuickReplyIndex
                                ? "bg-accent"
                                : "hover:bg-accent/70"
                            }`}
                            onMouseEnter={() =>
                              setSelectedQuickReplyIndex(index)
                            }
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectQuickReply(index)}
                          >
                            <span className="block text-[13px] font-semibold text-primary">
                              {reply.shortcut}
                            </span>
                            <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                              {reply.content}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div
                      ref={editableDiv}
                      contentEditable={inCSWindow}
                      className={`${
                        !inCSWindow ? "cursor-pointer" : ""
                      } outline-none mx-[5px] py-[10px] min-h-[40px] max-h-40 overflow-y-auto text-[15px] leading-[20px] break-words`}
                      onInput={(event) => {
                        if (!(event.target instanceof Element)) {
                          return;
                        }

                        // Use secure utility to sanitize and convert HTML to Markdown
                        const message = htmlToMarkdown(
                          event.currentTarget.innerHTML,
                        );

                        setMessage(message);

                        if (conv.created_at !== conv.updated_at) {
                          // no drafts for new convs, sorry!
                          debounce(
                            () => saveDraft(conv, message, sendAsContact),
                            3000,
                          ); // milliseconds
                        }
                      }}
                      onKeyDown={(event) => {
                        if (
                          quickReplyPickerOpen &&
                          !event.ctrlKey &&
                          !event.metaKey &&
                          !event.shiftKey
                        ) {
                          const action = getQuickReplyKeyboardAction(
                            event.key,
                            selectedQuickReplyIndex,
                            quickReplySuggestions.length,
                          );

                          if (action.type === "move") {
                            event.preventDefault();
                            setSelectedQuickReplyIndex(action.index);
                            return;
                          }
                          if (action.type === "select") {
                            event.preventDefault();
                            selectQuickReply(action.index);
                            return;
                          }
                          if (action.type === "close") {
                            event.preventDefault();
                            setDismissedQuickReplyDraft(message);
                            return;
                          }
                        }

                        if (event.key === "Enter" && event.ctrlKey) {
                          // toggle("sendAsContact") is handled at window level, nonetheless this
                          // no-op block prevents from sending the message when pressing ctrl+enter
                        } else if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          window.matchMedia("(min-width: 768px)").matches
                        ) {
                          event.preventDefault();
                          sendTextMessage();
                        }
                      }}
                      onClick={() =>
                        !inCSWindow &&
                        conv.service === "whatsapp" &&
                        toggle("templatePicker")
                      }
                      title={
                        inCSWindow
                          ? undefined
                          : conv.service === "whatsapp"
                            ? t(
                                "WhatsApp cierra la conversación a las 24 horas del último mensaje recibido. Para abrir la conversación debes utilizar una plantilla.",
                              )
                            : t(
                                "La conversación se cerró 24 horas después del último mensaje del contacto. Esperá a que te escriba de nuevo para responder.",
                              )
                      }
                    />
                    {!message && (
                      <div
                        className={
                          "absolute bottom-[1px] py-[10px] mx-[5px] max-h-[40px] text-[15px] text-muted-foreground" +
                          (inCSWindow ? "" : " cursor-pointer")
                        }
                        onClick={() =>
                          inCSWindow
                            ? editableDiv.current?.focus()
                            : conv.service === "whatsapp"
                              ? toggle("templatePicker")
                              : undefined
                        }
                      >
                        {!inCSWindow ? (
                          conv.service === "whatsapp" ? (
                            <>
                              <span className="lg:hidden">
                                {t("Conversación cerrada")}
                              </span>
                              <span className="hidden lg:inline">
                                {t(
                                  "Conversación cerrada, abre la conversación con una plantilla",
                                )}
                              </span>
                            </>
                          ) : (
                            <span>{t("Conversación cerrada")}</span>
                          )
                        ) : sendAsContact ? (
                          <>
                            <span className="lg:hidden">
                              {t("Mensaje entrante")}
                            </span>
                            <span className="hidden lg:inline">
                              {t("Simula un mensaje entrante")}
                            </span>
                          </>
                        ) : conv.service === "whatsapp" ||
                          conv.service === "instagram" ? (
                          <>
                            <span className="lg:hidden">{t("Cerrará en")}</span>
                            <span className="hidden lg:inline">
                              {t("La conversación cerrará en")}
                            </span>{" "}
                            <span>{remaining}</span>
                          </>
                        ) : (
                          <span>{t("Escribe un mensaje")}</span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Send button */}
              {!templateDraft &&
                !message &&
                conv.service === "whatsapp" &&
                !sendAsContact && (
                  <button
                    type="button"
                    disabled={!inCSWindow}
                    className="rounded-full p-[8px] hover:bg-accent disabled:opacity-50"
                    onClick={() => setVoiceRecorderOpen(true)}
                    title={t("Grabar mensaje de voz")}
                  >
                    <Mic className="h-6 w-6" />
                  </button>
                )}
              <button
                disabled={templateDraft ? !allVarsFilled : !inCSWindow}
                className={
                  "p-[8px] rounded-full bg-primary disabled:opacity-50" +
                  (templateDraft
                    ? allVarsFilled
                      ? " cursor-pointer"
                      : ""
                    : !inCSWindow
                      ? ""
                      : " cursor-pointer")
                }
                onClick={() => {
                  if (templateDraft) {
                    allVarsFilled && sendTemplateMessage();
                  } else if (message) {
                    sendTextMessage();
                  } else if (conv.service === "local") {
                    // Only the internal service can simulate incoming messages
                    toggle("sendAsContact");
                  }
                }}
                title={
                  templateDraft
                    ? t("Enviar plantilla")
                    : sendAsContact
                      ? t("Recibir mensaje")
                      : t("Enviar mensaje")
                }
              >
                <svg
                  className={
                    "w-[24px] h-[24px] transition" +
                    (sendAsContact && !templateDraft ? " -scale-x-100" : "") +
                    " text-primary-foreground"
                  }
                >
                  <use href="/icons.svg#send" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    )
  );
}
