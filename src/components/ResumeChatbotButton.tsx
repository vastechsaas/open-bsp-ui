import { useTranslation } from "@/hooks/useTranslation";
import { useNodeChatbotResume } from "@/queries/useChatbotFlows";

export default function ResumeChatbotButton({ conversationId }: { conversationId?: string }) {
  const { translate: t } = useTranslation();
  const { mapping, resume } = useNodeChatbotResume(conversationId);
  if (!mapping.data) return null;
  return <div className="flex flex-col items-end gap-1">
    <button type="button" className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
      disabled={resume.isPending} onClick={() => resume.mutate()}>
      {t("Reanudar chatbot")}
    </button>
    {resume.isError && <span role="alert" className="max-w-[220px] text-xs text-destructive">{resume.error.message}</span>}
  </div>;
}
