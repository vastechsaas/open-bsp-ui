import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  CircleStop,
  MessageSquareText,
  Play,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { ChatbotFlowNode } from "@/utils/ChatbotFlowUtils";

const nodePresentation: Record<
  string,
  {
    icon: LucideIcon;
    badge: string;
    accent: string;
    iconBackground: string;
  }
> = {
  start: {
    icon: Play,
    badge: "START",
    accent: "border-emerald-500/45",
    iconBackground: "bg-emerald-500/15 text-emerald-500",
  },
  send_message: {
    icon: MessageSquareText,
    badge: "MESSAGE",
    accent: "border-primary/45",
    iconBackground: "bg-primary/15 text-primary",
  },
  end: {
    icon: CircleStop,
    badge: "END",
    accent: "border-rose-500/45",
    iconBackground: "bg-rose-500/15 text-rose-500",
  },
};

export default function ChatbotFlowNode({
  data,
  selected,
  isConnectable,
}: NodeProps<ChatbotFlowNode>) {
  const { translate: t } = useTranslation();
  const presentation =
    nodePresentation[data.node_type] ?? nodePresentation.send_message;
  const Icon = presentation.icon;
  const isStart = data.node_type === "start";
  const isEnd = data.node_type === "end";
  const isMessage = data.node_type === "send_message";
  const messageText =
    isMessage && typeof data.config.text === "string" ? data.config.text : "";

  return (
    <div
      className={`w-[230px] overflow-visible rounded-xl border bg-card text-card-foreground shadow-md transition ${
        selected ? "border-primary ring-2 ring-primary/20" : presentation.accent
      }`}
    >
      {!isStart && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          className="!h-[10px] !w-[10px] !border-2 !border-card !bg-muted-foreground"
        />
      )}

      <div className="flex items-center gap-[10px] p-[12px]">
        <div
          className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg ${presentation.iconBackground}`}
        >
          <Icon className="h-[17px] w-[17px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold">
            {t(data.label)}
          </div>
          <div className="mt-[3px] inline-flex rounded bg-muted px-[5px] py-[2px] text-[8px] font-bold tracking-[0.09em] text-muted-foreground">
            {presentation.badge}
          </div>
        </div>
      </div>

      {isMessage && (
        <div className="border-t border-border px-[12px] py-[9px]">
          {messageText.trim() ? (
            <p className="line-clamp-3 text-[10px] leading-relaxed text-muted-foreground">
              {messageText}
            </p>
          ) : (
            <p className="text-[10px] font-medium text-destructive">
              {t("Mensaje requerido")}
            </p>
          )}
        </div>
      )}

      {!isEnd && (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="!h-[10px] !w-[10px] !border-2 !border-card !bg-primary"
        />
      )}
    </div>
  );
}
