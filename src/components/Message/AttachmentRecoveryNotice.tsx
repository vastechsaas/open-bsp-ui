import { useRef, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase, type MessageRow } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import type { attachmentRecovery } from "@/utils/AttachmentRecovery";

export default function AttachmentRecoveryNotice({
  message,
  recovery,
}: {
  message: MessageRow;
  recovery: NonNullable<ReturnType<typeof attachmentRecovery>>;
}) {
  const { translate: t } = useTranslation();
  const busy = useRef(false);
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [exhausted, setExhausted] = useState(false);

  async function retry() {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setFeedback("");
    const userId = useBoundStore.getState().ui.user?.id;
    try {
      const { data } = await supabase
        .rpc("retry_whatsapp_attachment_recovery", {
          p_message_id: message.id,
        })
        .throwOnError();
      if (data === "cooldown") {
        setFeedback("Esperá cinco minutos entre reintentos.");
      } else if (data === "rate_limited") {
        setFeedback("WhatsApp pidió esperar antes de reintentar.");
      } else if (data === "limit") {
        setExhausted(true);
        setFeedback("Ya se usaron los dos reintentos manuales.");
      } else if (data === "pending" || data === "ready") {
        const { data: current } = await supabase
          .from("messages")
          .select()
          .eq("organization_id", message.organization_id)
          .eq("id", message.id)
          .maybeSingle()
          .throwOnError();
        const store = useBoundStore.getState();
        if (
          current &&
          store.ui.user?.id === userId &&
          store.ui.activeOrgId === message.organization_id
        )
          store.chat.pushMessages([current as MessageRow]);
      } else {
        setFeedback("No se pudo solicitar el reintento.");
      }
    } catch {
      setFeedback("No se pudo solicitar el reintento.");
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }

  return (
    <div className="min-w-0 rounded-md bg-black/5 px-3 py-2 text-sm dark:bg-white/5">
      <p role="status">{t(recovery.label)}</p>
      {recovery.retry && !exhausted && (
        <button
          type="button"
          className="mt-1 font-medium underline underline-offset-2 disabled:opacity-60"
          disabled={working}
          onClick={() => void retry()}
        >
          {t("Reintentar")}
        </button>
      )}
      {feedback && (
        <p className="mt-1 text-xs" role="status">
          {t(feedback)}
        </p>
      )}
    </div>
  );
}
