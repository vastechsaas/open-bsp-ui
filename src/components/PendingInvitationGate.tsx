import { Bell } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { queryKeys } from "@/queries/queryKeys";
import { useUpdateAgent } from "@/queries/useAgents";
import type { HumanAgentRow } from "@/supabase/client";

export default function PendingInvitationGate({
  invitations,
}: {
  invitations: HumanAgentRow[];
}) {
  const { translate: t } = useTranslation();
  const queryClient = useQueryClient();
  const updateAgent = useUpdateAgent();

  const roles: Record<string, string> = {
    agent: t("Agente"),
    owner: t("Propietario"),
    admin: t("Administrador"),
    supervisor: t("Supervisor"),
    member: t("Miembro"),
  };

  const respond = async (agentId: string, status: "accepted" | "rejected") => {
    updateAgent.reset();
    await updateAgent.mutateAsync({
      id: agentId,
      extra: { invitation: { status } },
    });
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.invitations(),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.all(),
      }),
    ]);
  };

  return (
    <div className="flex h-full w-full items-center justify-center p-5">
      <section className="w-full max-w-[560px] rounded-2xl border border-border bg-background p-6 shadow-sm">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {t("Invitación pendiente")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Aceptá una invitación para acceder a la organización.")}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {invitations.map((invitation) => (
            <article
              key={invitation.id}
              className="rounded-xl border border-border bg-muted/40 p-4"
            >
              <div className="font-medium text-foreground">
                {invitation.extra?.invitation?.organization_name}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {roles[invitation.extra?.role || "member"]}
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={updateAgent.isPending}
                  onClick={() => void respond(invitation.id, "rejected")}
                >
                  {t("Rechazar")}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={updateAgent.isPending}
                  onClick={() => void respond(invitation.id, "accepted")}
                >
                  {updateAgent.isPending ? <Spinner size={16} /> : t("Aceptar")}
                </button>
              </div>
            </article>
          ))}
        </div>

        {updateAgent.isError && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {t("No se pudo responder a la invitación.")}
          </p>
        )}
      </section>
    </div>
  );
}
