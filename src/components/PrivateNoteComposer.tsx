import { Send, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import useBoundStore from "@/stores/useBoundStore";
import {
  useCreatePrivateNote,
  useMentionableHumans,
} from "@/queries/usePrivateNotes";
import { useTranslation } from "@/hooks/useTranslation";
import {
  addMentionedAgentId,
  findActiveMention,
  insertMention,
} from "@/utils/MentionUtils";

export default function PrivateNoteComposer({
  conversationId,
}: {
  conversationId: string;
}) {
  const { translate: t } = useTranslation();
  const draft = useBoundStore((state) =>
    state.chat.privateNoteDrafts.get(conversationId),
  ) || { text: "", mentionedAgentIds: [] };
  const setDraft = useBoundStore(
    (state) => state.chat.setConversationPrivateNoteDraft,
  );
  const pushMessages = useBoundStore((state) => state.chat.pushMessages);
  const createNote = useCreatePrivateNote();
  const { data: humans = [] } = useMentionableHumans();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursor, setCursor] = useState(draft.text.length);
  const activeMention = findActiveMention(draft.text, cursor);
  const suggestions = useMemo(() => {
    if (!activeMention) return [];

    const query = activeMention.query.toLocaleLowerCase();
    return humans
      .filter(
        (human) =>
          !draft.mentionedAgentIds.includes(human.id) &&
          (!query ||
            human.name.toLocaleLowerCase().includes(query) ||
            human.role.toLocaleLowerCase().includes(query)),
      )
      .slice(0, 8);
  }, [activeMention, draft.mentionedAgentIds, humans]);
  const selectedHumans = draft.mentionedAgentIds
    .map((id) => humans.find((human) => human.id === id))
    .filter((human) => human !== undefined);

  const selectMention = (agentId: string, name: string) => {
    if (!activeMention) return;

    const inserted = insertMention(draft.text, activeMention, name);
    setDraft(conversationId, {
      text: inserted.text,
      mentionedAgentIds: addMentionedAgentId(draft.mentionedAgentIds, agentId),
    });
    setCursor(inserted.cursor);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(inserted.cursor, inserted.cursor);
    });
  };

  const submit = async () => {
    const text = draft.text.trim();
    if (!text || createNote.isPending) return;

    const message = await createNote.mutateAsync({
      conversationId,
      text,
      mentionedAgentIds: draft.mentionedAgentIds,
    });

    pushMessages([message]);
    setDraft(conversationId, { text: "", mentionedAgentIds: [] });
  };

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-100 p-2 text-amber-950 shadow-sm dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-50">
      <div className="px-2 pb-1 text-[12px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
        {t("Nota privada")}
      </div>
      {selectedHumans.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pb-1">
          {selectedHumans.map((human) => (
            <span
              key={human.id}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[12px] dark:border-amber-700 dark:bg-amber-900"
            >
              @{human.name}
              <button
                type="button"
                title={t("Quitar mención")}
                onClick={() =>
                  setDraft(conversationId, {
                    ...draft,
                    mentionedAgentIds: draft.mentionedAgentIds.filter(
                      (id) => id !== human.id,
                    ),
                  })
                }
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="relative grow">
          <textarea
            ref={textareaRef}
            value={draft.text}
            rows={1}
            className="max-h-40 min-h-10 w-full resize-none bg-transparent px-2 py-2 text-[15px] outline-none placeholder:text-amber-700/60 dark:placeholder:text-amber-300/60"
            placeholder={t("Escribe una nota interna")}
            onChange={(event) => {
              const nextText = event.target.value;
              setDraft(conversationId, {
                ...draft,
                text: nextText,
              });
              setCursor(event.target.selectionStart ?? nextText.length);
            }}
            onClick={(event) => setCursor(event.currentTarget.selectionStart)}
            onKeyUp={(event) => setCursor(event.currentTarget.selectionStart)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                window.matchMedia("(min-width: 768px)").matches
              ) {
                event.preventDefault();
                void submit();
              }
            }}
          />
          {activeMention && (
            <div className="absolute bottom-full left-0 z-20 mb-1 max-h-56 w-full overflow-y-auto rounded-xl border border-amber-300 bg-background p-1 text-foreground shadow-lg">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase text-muted-foreground">
                {t("Mencionar personas")}
              </div>
              {suggestions.length > 0 ? (
                suggestions.map((human) => (
                  <button
                    key={human.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-accent"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectMention(human.id, human.name)}
                  >
                    <span className="truncate text-[14px]">{human.name}</span>
                    <span className="ml-2 text-[11px] capitalize text-muted-foreground">
                      {human.role}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-2 py-2 text-[13px] text-muted-foreground">
                  {t("Sin personas para mencionar")}
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={!draft.text.trim() || createNote.isPending}
          className="rounded-full bg-amber-600 p-2 text-white disabled:opacity-50"
          onClick={() => void submit()}
          title={t("Guardar nota privada")}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
      {createNote.error && (
        <div className="px-2 pt-1 text-[12px] text-red-700 dark:text-red-300">
          {createNote.error.message}
        </div>
      )}
    </div>
  );
}
