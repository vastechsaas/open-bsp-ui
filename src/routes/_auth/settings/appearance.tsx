import { createFileRoute } from "@tanstack/react-router";
import { Check, Palette } from "lucide-react";
import { message as toast, Spin } from "antd";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import {
  type ChatBubbleTheme,
  useOrganizationAppearanceSettings,
  useUpdateOrganizationChatBubbleTheme,
} from "@/queries/useOrganizationAppearance";

export const Route = createFileRoute("/_auth/settings/appearance")({
  component: OrganizationAppearanceSettings,
});

const themeOptions: Array<{
  value: ChatBubbleTheme;
  label: string;
  swatch: string;
}> = [
  { value: "orange", label: "Naranja", swatch: "bg-[#e8b49e]" },
  { value: "green", label: "Verde", swatch: "bg-[#9ee493]" },
  { value: "blue", label: "Azul", swatch: "bg-[#93c5fd]" },
  { value: "purple", label: "Morado", swatch: "bg-[#c4b5fd]" },
  { value: "teal", label: "Turquesa", swatch: "bg-[#5eead4]" },
];

function OrganizationAppearanceSettings() {
  const { translate: t } = useTranslation();
  const { data: currentAgent, isPending: agentPending } = useCurrentAgent();
  const settings = useOrganizationAppearanceSettings();
  const updateTheme = useUpdateOrganizationChatBubbleTheme();
  const role = currentAgent?.extra?.role;
  const canManage =
    role === "owner" || role === "admin" || role === "supervisor";
  const selectedTheme =
    (settings.data?.chat_bubble_theme as ChatBubbleTheme | undefined) ??
    "orange";

  if (!agentPending && !canManage) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[13px] text-destructive">
        {t(
          "Solo propietarios, administradores y supervisores pueden administrar la apariencia.",
        )}
      </div>
    );
  }

  if (agentPending || settings.isPending) {
    return <Spin className="m-auto" />;
  }

  if (settings.isError) {
    return (
      <div className="m-auto p-6 text-center text-[13px] text-destructive">
        {t("No se pudo cargar la configuración de apariencia.")}
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
      <div className="flex items-start gap-3 border-b border-border pb-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Palette className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("Apariencia")}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t(
              "Personaliza cómo se ven las conversaciones de tu organización.",
            )}
          </p>
        </div>
      </div>

      <section className="py-6">
        <h3 className="text-sm font-semibold text-foreground">
          {t("Color de la burbuja de respuesta")}
        </h3>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {t("El color seleccionado se aplica a las respuestas de tu equipo.")}
        </p>

        <div className="mt-4 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-5">
          {themeOptions.map((option) => {
            const selected = selectedTheme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={updateTheme.isPending}
                aria-pressed={selected}
                onClick={() => {
                  if (selected) return;
                  updateTheme.mutate(option.value, {
                    onSuccess: () =>
                      void toast.success(t("Apariencia actualizada")),
                    onError: () =>
                      void toast.error(
                        t("No se pudo actualizar la apariencia"),
                      ),
                  });
                }}
                className={`relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-[12px] font-medium transition-colors disabled:cursor-wait disabled:opacity-60 ${
                  selected
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <span
                  className={`h-9 w-9 rounded-full border border-black/10 ${option.swatch}`}
                />
                {t(option.label)}
                {selected && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-foreground">
          {t("Vista previa")}
        </h3>
        <div className="mt-4 max-w-xl rounded-2xl border border-border bg-muted/40 p-4">
          <div className="mr-auto w-fit max-w-[80%] rounded-xl bg-incoming-chat-bubble px-4 py-2 text-[13px] text-foreground shadow-sm">
            {t("Mensaje del cliente")}
          </div>
          <div className="ml-auto mt-3 w-fit max-w-[80%] rounded-xl bg-outgoing-chat-bubble px-4 py-2 text-[13px] text-foreground shadow-sm">
            {t("Respuesta de tu equipo")}
          </div>
        </div>
      </section>
    </div>
  );
}
