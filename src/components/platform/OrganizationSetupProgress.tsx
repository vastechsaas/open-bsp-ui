import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/useTranslation";
import useBoundStore from "@/stores/useBoundStore";
import {
  organizationSetupRequest,
  useOrganizationSetup,
} from "@/queries/useOrganizationSetup";
import { accountSetupError } from "@/utils/AccountOnboardingUtils";
import {
  directSetupValid,
  setupPersonLabel,
  setupPersonReady,
  type OrganizationSetupPerson,
  type OrganizationSetupResult,
  type TransientSetupSecret,
} from "@/utils/OrganizationSetupUtils";
import AccountSetupFields, {
  useAccountSetupFields,
} from "./AccountSetupFields";
import { queryKeys } from "@/queries/queryKeys";

export default function OrganizationSetupProgress({
  provisioningId,
  initial,
  secrets,
  onClose,
}: {
  provisioningId: string;
  initial?: OrganizationSetupResult;
  secrets?: Map<string, TransientSetupSecret>;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const query = useOrganizationSetup(provisioningId, initial);
  const client = useQueryClient();
  const userId = useBoundStore((s) => s.ui.user?.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const locked = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const started = useRef(false);
  useEffect(
    () => () => {
      controller.current?.abort();
      if (started.current) secrets?.clear();
    },
    [provisioningId, secrets, userId],
  );
  const run = useCallback(
    async (memberId?: string, secret?: TransientSetupSecret) => {
      if (locked.current) return;
      locked.current = true;
      setBusy(true);
      setError(false);
      const abort = new AbortController();
      controller.current = abort;
      try {
        await client.cancelQueries({
          queryKey: ["platform-organization-setup", userId, provisioningId],
        });
        let current = await organizationSetupRequest<OrganizationSetupResult>(
          { version: 2, action: "status", provisioning_id: provisioningId },
          abort.signal,
          userId,
        );
        if (current.version !== 2) throw new Error("Legacy record");
        const targets = current.people.filter(
          (p) =>
            !setupPersonReady(p) && (!memberId || p.member_id === memberId),
        );
        for (const person of targets) {
          if (
            abort.signal.aborted ||
            useBoundStore.getState().ui.user?.id !== userId
          )
            return;
          const credential = secret ?? secrets?.get(person.client_key);
          secrets?.delete(person.client_key);
          current = await organizationSetupRequest<OrganizationSetupResult>(
            {
              version: 2,
              action: "continue",
              provisioning_id: provisioningId,
              member_id: person.member_id,
              ...(person.mode === "direct" && directSetupValid(credential)
                ? { password: credential!.password, confirmed: true }
                : {}),
            },
            abort.signal,
            userId,
          );
          if (
            abort.signal.aborted ||
            useBoundStore.getState().ui.user?.id !== userId
          )
            return;
          client.setQueryData(
            ["platform-organization-setup", userId, provisioningId],
            current,
          );
        }
        await client.invalidateQueries({ queryKey: queryKeys.platform.root() });
      } catch {
        if (!abort.signal.aborted) setError(true);
      } finally {
        secrets?.clear();
        locked.current = false;
        if (!abort.signal.aborted) setBusy(false);
      }
    },
    [client, provisioningId, secrets, userId],
  );
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active && initial && !started.current) {
        started.current = true;
        void run();
      }
    });
    return () => {
      active = false;
    };
  }, [initial, run]);
  if (query.isPending)
    return <p className="p-4">{t("Configuración en curso")}</p>;
  if (query.isError || !query.data)
    return (
      <div role="alert" className="space-y-3 p-4">
        <p>{t("No se pudo cargar la configuración de acceso.")}</p>
        <button className="underline" onClick={() => void query.refetch()}>
          {t("Reintentar")}
        </button>
        <button className="ml-4" onClick={onClose}>
          {t("Cerrar")}
        </button>
      </div>
    );
  if (query.data.version !== 2) return null;
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
      <header>
        <h2 className="font-semibold">{query.data.organization_name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "La organización está creada. Revisá el acceso de cada persona; una invitación enviada no significa que ya se haya unido.",
          )}
        </p>
      </header>
      <div className="divide-y divide-border">
        {query.data.people.map((person) => (
          <PersonProgress
            key={person.member_id}
            person={person}
            busy={busy}
            onRetry={(secret) => run(person.member_id, secret)}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t(
            "No se pudo confirmar la configuración. Consultá el estado antes de reintentar.",
          )}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          disabled={busy || !query.data.has_remaining_work}
          onClick={() => void run()}
        >
          {busy ? t("Configuración en curso") : t("Continuar configuración")}
        </button>
        <button
          className="rounded-lg border border-border px-4 py-2 text-sm"
          disabled={busy}
          onClick={() => void query.refetch()}
        >
          {t("Actualizar")}
        </button>
        <button
          className="rounded-lg border border-border px-4 py-2 text-sm"
          onClick={onClose}
        >
          {t("Cerrar")}
        </button>
      </div>
    </section>
  );
}
function PersonProgress({
  person,
  busy,
  onRetry,
}: {
  person: OrganizationSetupPerson;
  busy: boolean;
  onRetry: (secret?: TransientSetupSecret) => Promise<void>;
}) {
  const { translate: t } = useTranslation();
  const fields = useAccountSetupFields("direct");
  const direct =
    person.mode === "direct" &&
    !setupPersonReady(person) &&
    person.status !== "processing";
  return (
    <article className="space-y-3 py-4">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="font-medium">{person.name}</p>
          <p className="text-xs text-muted-foreground">{person.email}</p>
        </div>
        <p
          role="status"
          className={
            person.status === "failed"
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {t(setupPersonLabel(person))}
        </p>
      </div>
      {person.failure_code && (
        <p className="text-sm text-destructive">
          {t(accountSetupError(person.failure_code))}
        </p>
      )}
      {direct && (
        <AccountSetupFields fields={fields} pending={busy} lockedMode />
      )}
      {!setupPersonReady(person) && (
        <button
          className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
          disabled={busy || (direct && !directSetupValid(fields))}
          onClick={() => {
            const credential = direct
              ? {
                  password: fields.password,
                  confirmation: fields.confirmation,
                  confirmed: fields.confirmed,
                }
              : undefined;
            fields.setPassword("");
            fields.setConfirmation("");
            fields.setConfirmed(false);
            void onRetry(credential);
          }}
        >
          {t("Reintentar configuración")}
        </button>
      )}
    </article>
  );
}
