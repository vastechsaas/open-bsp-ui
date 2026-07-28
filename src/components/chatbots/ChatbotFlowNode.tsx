import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  CircleStop,
  GitBranch,
  List,
  MessageSquareText,
  MousePointerClick,
  Play,
  TextCursorInput,
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
  interactive_buttons: {
    icon: MousePointerClick,
    badge: "BUTTONS",
    accent: "border-sky-500/45",
    iconBackground: "bg-sky-500/15 text-sky-500",
  },
  list_message: {
    icon: List,
    badge: "LIST",
    accent: "border-teal-500/45",
    iconBackground: "bg-teal-500/15 text-teal-500",
  },
  collect_input: {
    icon: TextCursorInput,
    badge: "INPUT",
    accent: "border-amber-500/45",
    iconBackground: "bg-amber-500/15 text-amber-500",
  },
  condition: {
    icon: GitBranch,
    badge: "CONDITION",
    accent: "border-orange-500/45",
    iconBackground: "bg-orange-500/15 text-orange-500",
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
  const isButtons = data.node_type === "interactive_buttons";
  const isList = data.node_type === "list_message";
  const isInteractive = isButtons || isList;
  const isCollectInput = data.node_type === "collect_input";
  const isCondition = data.node_type === "condition";
  const messageText =
    isMessage && typeof data.config.text === "string" ? data.config.text : "";
  const prompt =
    isCollectInput && typeof data.config.prompt === "string"
      ? data.config.prompt
      : "";
  const variable =
    typeof data.config.variable === "string" ? data.config.variable : "";
  const interactiveBody =
    isInteractive && typeof data.config.body === "string"
      ? data.config.body
      : "";
  const interactiveOptions = isButtons
    ? (data.config.buttons ?? []).map((button) => ({
        id: button.id,
        title: button.title,
      }))
    : isList
      ? (data.config.sections ?? []).flatMap((section) =>
          section.rows.map((row) => ({ id: row.id, title: row.title })),
        )
      : [];

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

      {isCollectInput && (
        <div className="space-y-[4px] border-t border-border px-[12px] py-[9px]">
          <p
            className={`line-clamp-2 text-[10px] leading-relaxed ${
              prompt.trim() ? "text-muted-foreground" : "text-destructive"
            }`}
          >
            {prompt.trim() ? prompt : t("Pregunta requerida")}
          </p>
          <div
            className={`truncate font-mono text-[9px] font-semibold ${
              variable ? "text-amber-500" : "text-destructive"
            }`}
          >
            {variable || t("Variable requerida")}
          </div>
        </div>
      )}

      {isInteractive && (
        <div className="border-t border-border">
          <p
            className={`line-clamp-2 px-[12px] py-[8px] text-[10px] leading-relaxed ${
              interactiveBody.trim()
                ? "text-muted-foreground"
                : "text-destructive"
            }`}
          >
            {interactiveBody.trim() ? interactiveBody : t("Mensaje requerido")}
          </p>
          {interactiveOptions.map((option, index) => (
            <div
              key={option.id}
              className="relative flex items-center justify-between gap-[8px] border-t border-border/70 px-[12px] py-[7px]"
            >
              <span
                className={`truncate text-[9px] ${
                  option.title.trim()
                    ? "text-muted-foreground"
                    : "text-destructive"
                }`}
              >
                {option.title.trim() || `${t("Opción")} ${index + 1}`}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={option.id}
                isConnectable={isConnectable}
                className={`!right-[-5px] !h-[9px] !w-[9px] !border-2 !border-card ${
                  isButtons ? "!bg-sky-500" : "!bg-teal-500"
                }`}
              />
            </div>
          ))}
        </div>
      )}

      {isCondition && (
        <div className="border-t border-border">
          <div className="px-[12px] py-[7px] font-mono text-[9px] font-semibold text-orange-500">
            {variable || t("Variable requerida")}
          </div>
          {(data.branches ?? []).map((branch) => (
            <div
              key={branch.id}
              className="relative flex items-center justify-between gap-[8px] border-t border-border/70 px-[12px] py-[7px]"
            >
              <span className="truncate text-[9px] text-muted-foreground">
                {branch.operator.replaceAll("_", " ")}
                {branch.value ? ` · ${branch.value}` : ""}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={branch.id}
                isConnectable={isConnectable}
                className="!right-[-5px] !h-[9px] !w-[9px] !border-2 !border-card !bg-orange-500"
              />
            </div>
          ))}
          <div className="relative flex items-center justify-between border-t border-border/70 px-[12px] py-[7px]">
            <span className="text-[9px] font-medium text-muted-foreground">
              {t("Fallback")}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="default"
              isConnectable={isConnectable}
              className="!right-[-5px] !h-[9px] !w-[9px] !border-2 !border-card !bg-muted-foreground"
            />
          </div>
        </div>
      )}

      {!isEnd && !isCondition && !isInteractive && (
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
