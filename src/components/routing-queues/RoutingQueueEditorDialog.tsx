import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function RoutingQueueEditorDialog({
  title,
  initialName,
  initialAgentIds,
  initialAssignmentStrategy,
  agents,
  saving,
  onSave,
  onClose,
}: {
  title: string;
  initialName?: string;
  initialAgentIds?: string[];
  initialAssignmentStrategy?: "manual" | "round_robin";
  agents: Array<{ id: string; name: string }>;
  saving: boolean;
  onSave: (values: {
    name: string;
    agentIds: string[];
    assignmentStrategy: "manual" | "round_robin";
  }) => Promise<void>;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const [name, setName] = useState(initialName ?? "");
  const [agentIds, setAgentIds] = useState<string[]>(initialAgentIds ?? []);
  const [assignmentStrategy, setAssignmentStrategy] = useState<
    "manual" | "round_robin"
  >(initialAssignmentStrategy ?? "manual");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || saving) return;
    await onSave({ name, agentIds, assignmentStrategy });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => void submit(event)}
        className="w-full max-w-lg rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            className="ml-auto rounded-lg p-1.5 hover:bg-muted"
            onClick={onClose}
            aria-label={t("Cerrar")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-5 block text-sm font-medium">
          {t("Nombre")}
          <input
            autoFocus
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="VIP Support"
            className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-foreground outline-none focus:ring-2 focus:ring-primary/25"
          />
        </label>

        <label className="mt-5 block text-sm font-medium">
          {t("Estrategia de asignación")}
          <select
            value={assignmentStrategy}
            onChange={(event) =>
              setAssignmentStrategy(
                event.target.value as "manual" | "round_robin",
              )
            }
            className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3"
          >
            <option value="manual">{t("Asignación manual")}</option>
            <option value="round_robin">Round Robin</option>
          </select>
          <span className="mt-2 block text-xs font-normal text-muted-foreground">
            {t(
              "Round Robin también requiere que la automatización de la organización esté activada.",
            )}
          </span>
        </label>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium">
            {t("Agentes elegibles")}
          </legend>
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
            {agents.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                {t("No hay agentes aceptados disponibles.")}
              </p>
            ) : (
              agents.map((agent) => (
                <label
                  key={agent.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={agentIds.includes(agent.id)}
                    onChange={(event) =>
                      setAgentIds((current) =>
                        event.target.checked
                          ? [...current, agent.id]
                          : current.filter((id) => id !== agent.id),
                      )
                    }
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm">{agent.name}</span>
                </label>
              ))
            )}
          </div>
        </fieldset>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            disabled={saving}
            onClick={onClose}
          >
            {t("Cancelar")}
          </button>
          <button
            type="submit"
            className="primary px-4 py-2 text-sm disabled:opacity-50"
            disabled={saving || !name.trim()}
          >
            {saving ? t("Guardando…") : t("Guardar")}
          </button>
        </div>
      </form>
    </div>
  );
}
