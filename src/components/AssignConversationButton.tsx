import { useState } from "react";
import { message } from "antd";
import { LoaderCircle, UserRoundCheck } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { assignConversationToMe } from "@/utils/ConversationUtils";

export default function AssignConversationButton({
  conversationId,
  className = "",
}: {
  conversationId: string;
  className?: string;
}) {
  const [isAssigning, setIsAssigning] = useState(false);
  const { translate: t } = useTranslation();

  const assign = async () => {
    if (isAssigning) return;

    setIsAssigning(true);
    try {
      await assignConversationToMe(conversationId);
      void message.success(t("Conversación asignada"));
    } catch {
      void message.error(t("No se pudo actualizar la asignación"));
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <button
      type="button"
      disabled={isAssigning}
      onClick={() => void assign()}
      className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      {isAssigning ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <UserRoundCheck className="h-4 w-4" aria-hidden />
      )}
      <span>{t("Asignarme")}</span>
    </button>
  );
}
