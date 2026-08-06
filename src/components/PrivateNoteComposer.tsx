import { Send } from "lucide-react";
import useBoundStore from "@/stores/useBoundStore";
import { useCreatePrivateNote } from "@/queries/usePrivateNotes";
import { useTranslation } from "@/hooks/useTranslation";

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
      <div className="flex items-end gap-2">
        <textarea
          value={draft.text}
          rows={1}
          className="max-h-40 min-h-10 grow resize-none bg-transparent px-2 py-2 text-[15px] outline-none placeholder:text-amber-700/60 dark:placeholder:text-amber-300/60"
          placeholder={t("Escribe una nota interna")}
          onChange={(event) =>
            setDraft(conversationId, {
              ...draft,
              text: event.target.value,
            })
          }
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
