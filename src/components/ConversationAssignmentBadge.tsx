import { ChevronDown } from "lucide-react";
import type { AgentRow, ConversationRow } from "@/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { getConversationAssignee } from "@/utils/AssignmentUtils";
import { nameInitials } from "@/utils/FormatUtils";
import Avatar from "./Avatar";

export default function ConversationAssignmentBadge({
  conversation,
  agents,
  interactive = false,
  className = "",
}: {
  conversation: ConversationRow;
  agents: AgentRow[] | undefined;
  interactive?: boolean;
  className?: string;
}) {
  const { translate: t } = useTranslation();
  const assignee = getConversationAssignee(conversation, agents);
  const isAssigned = conversation.assigned_agent_id !== null;
  const label = isAssigned
    ? assignee?.name
      ? `${t("Asignado")} · ${assignee.name}`
      : t("Asignado")
    : t("Sin asignar");

  const content = (
    <>
      {isAssigned && assignee && (
        <Avatar
          src={assignee.picture}
          fallback={nameInitials(assignee.name || "?")}
          size={18}
          className="shrink-0 border border-teal-500/30 bg-teal-500/15 text-[9px] text-teal-700 dark:text-teal-200"
        />
      )}
      <span className="truncate">{label}</span>
      {interactive && (
        <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
    </>
  );

  const styles = `inline-flex h-[24px] min-w-0 items-center gap-1.5 rounded-full border px-2 text-[11px] font-medium leading-none ${
    isAssigned
      ? "border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-200"
      : "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-200"
  } ${className}`;

  if (interactive) {
    return (
      <button
        type="button"
        className={`${styles} cursor-pointer transition-colors hover:bg-accent`}
        title={label}
        aria-label={`${label}. ${t("Asignar agente")}`}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={styles} title={label} aria-label={label}>
      {content}
    </span>
  );
}
