import { useTranslation } from "@/hooks/useTranslation";
import { apiRouteMatches } from "@/utils/ChatbotApiEditor";
import {
  isValidChatbotConnection,
  type ChatbotFlowEdge,
  type ChatbotFlowNode,
} from "@/utils/ChatbotFlowUtils";

export function ChatbotApiRoutes({
  nodeId,
  nodes,
  edges,
  onChange,
}: {
  nodeId: string;
  nodes: ChatbotFlowNode[];
  edges: ChatbotFlowEdge[];
  onChange: (outcome: "success" | "error", target: string) => void;
}) {
  const { translate: t } = useTranslation();
  return (
    <section className="space-y-2" data-validation-field="routing">
      <h3 className="text-xs font-semibold">{t("4. Próximos pasos")}</h3>
      {(["success", "error"] as const).map((outcome) => {
        const route = edges.find((edge) =>
          apiRouteMatches(edge, nodeId, outcome),
        );
        const remaining = edges.filter(
          (edge) => !apiRouteMatches(edge, nodeId, outcome),
        );
        const options = nodes.filter(
          (node) =>
            node.id === route?.target ||
            isValidChatbotConnection(
              { source: nodeId, target: node.id, sourceHandle: outcome },
              nodes,
              remaining,
            ),
        );
        return (
          <label key={outcome} className="block text-xs">
            {outcome === "success"
              ? t("Si la API responde correctamente")
              : t("Si la API falla")}
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              value={route?.target ?? ""}
              onChange={(event) => onChange(outcome, event.target.value)}
            >
              <option value="">{t("Elegir siguiente nodo")}</option>
              {route && !nodes.some((node) => node.id === route.target) && (
                <option value={route.target}>{t("Nodo no disponible")}</option>
              )}
              {options.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.data.label || node.id}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </section>
  );
}
