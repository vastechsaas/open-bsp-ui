import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Power,
  RefreshCw,
  Rocket,
  X,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { OrganizationAddressRow } from "@/supabase/client";
import type {
  ChatbotFlowDeployment,
  ChatbotFlowVersion,
} from "@/queries/useChatbotFlows";

export function ChatbotFlowDeploymentDialog({
  open,
  deployments,
  versions,
  addresses,
  loading,
  error,
  actionError,
  pending,
  onClose,
  onRetry,
  onActivate,
  onDeactivate,
}: {
  open: boolean;
  deployments: ChatbotFlowDeployment[];
  versions: ChatbotFlowVersion[];
  addresses: OrganizationAddressRow[];
  loading: boolean;
  error: boolean;
  actionError: boolean;
  pending: boolean;
  onClose: () => void;
  onRetry: () => void;
  onActivate: (input: {
    organizationAddress: string;
    versionId: string;
  }) => void;
  onDeactivate: (organizationAddress: string) => void;
}) {
  const { translate: t } = useTranslation();
  const publishedVersions = useMemo(
    () => versions.filter((version) => version.status === "published"),
    [versions],
  );
  const [organizationAddress, setOrganizationAddress] = useState("");
  const [versionId, setVersionId] = useState("");

  useEffect(() => {
    if (!open) return;
    setOrganizationAddress((current) => current || addresses[0]?.address || "");
    setVersionId((current) => current || publishedVersions[0]?.id || "");
  }, [addresses, open, publishedVersions]);

  useEffect(() => {
    const deployment = deployments.find(
      (item) => item.organization_address === organizationAddress,
    );
    if (!deployment) return;
    setVersionId(deployment.flow_version_id);
  }, [deployments, organizationAddress]);

  if (!open) return null;

  const canActivate = Boolean(organizationAddress && versionId);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-[16px] backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="chatbot-deployment-title"
        className="w-full max-w-[620px] rounded-2xl border border-border bg-background p-[18px] shadow-2xl"
      >
        <div className="flex items-start gap-[12px]">
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Rocket className="h-[20px] w-[20px]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="chatbot-deployment-title" className="font-semibold">
              {t("Activar chatbot")}
            </h2>
            <p className="mt-[4px] text-[12px] leading-relaxed text-muted-foreground">
              {t(
                "Elegí qué versión publicada responderá en cada número de WhatsApp.",
              )}
            </p>
          </div>
          <button
            type="button"
            title={t("Cerrar")}
            aria-label={t("Cerrar")}
            disabled={pending}
            className="flex h-[32px] w-[32px] items-center justify-center rounded-lg hover:bg-muted disabled:opacity-50"
            onClick={onClose}
          >
            <X className="h-[16px] w-[16px]" />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <RefreshCw className="h-[20px] w-[20px] animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="mt-[18px] rounded-xl border border-destructive/30 bg-destructive/8 p-[14px]">
            <div className="flex items-start gap-[9px] text-destructive">
              <CircleAlert className="mt-[1px] h-[16px] w-[16px]" />
              <p className="text-[12px]">
                {t("No se pudieron cargar las opciones de activación.")}
              </p>
            </div>
            <button
              type="button"
              className="mt-[12px] rounded-full border border-border px-[14px] py-[7px] text-[12px] hover:bg-muted"
              onClick={onRetry}
            >
              {t("Reintentar")}
            </button>
          </div>
        ) : (
          <>
            {deployments.length > 0 && (
              <div className="mt-[18px] space-y-[7px]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {t("Activaciones actuales")}
                </div>
                {deployments.map((deployment) => {
                  const version = versions.find(
                    (item) => item.id === deployment.flow_version_id,
                  );
                  return (
                    <div
                      key={deployment.organization_address}
                      className="flex items-center gap-[10px] rounded-xl border border-emerald-500/25 bg-emerald-500/7 px-[12px] py-[10px]"
                    >
                      <CheckCircle2 className="h-[16px] w-[16px] shrink-0 text-emerald-500" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-medium">
                          {deployment.organization_address}
                        </div>
                        <div className="mt-[1px] text-[10px] text-muted-foreground">
                          {t("Publicado")} v{version?.version ?? "—"}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded-full border border-border px-[11px] py-[6px] text-[11px] hover:bg-muted disabled:opacity-50"
                        onClick={() =>
                          onDeactivate(deployment.organization_address)
                        }
                      >
                        {t("Desactivar")}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-[18px] grid gap-[12px] sm:grid-cols-2">
              <DeploymentField label={t("Número de WhatsApp")}>
                <select
                  value={organizationAddress}
                  className="h-[40px] w-full rounded-lg border border-border bg-background px-[10px] text-[12px]"
                  onChange={(event) =>
                    setOrganizationAddress(event.target.value)
                  }
                >
                  {addresses.map((address) => (
                    <option key={address.address} value={address.address}>
                      {address.address}
                    </option>
                  ))}
                </select>
              </DeploymentField>
              <DeploymentField label={t("Versión publicada")}>
                <select
                  value={versionId}
                  className="h-[40px] w-full rounded-lg border border-border bg-background px-[10px] text-[12px]"
                  onChange={(event) => setVersionId(event.target.value)}
                >
                  {publishedVersions.map((version) => (
                    <option key={version.id} value={version.id}>
                      v{version.version}
                    </option>
                  ))}
                </select>
              </DeploymentField>
            </div>

            {addresses.length === 0 ||
            publishedVersions.length === 0 ? (
              <div className="mt-[14px] rounded-lg border border-amber-500/30 bg-amber-500/8 px-[11px] py-[9px] text-[11px] text-amber-600 dark:text-amber-400">
                {t(
                  "Necesitás un número de WhatsApp conectado y una versión publicada.",
                )}
              </div>
            ) : null}

            {actionError && (
              <div
                role="alert"
                className="mt-[14px] rounded-lg border border-destructive/30 bg-destructive/8 px-[11px] py-[9px] text-[11px] text-destructive"
              >
                {t(
                  "No se pudo cambiar la activación. Revisá las opciones e intentá nuevamente.",
                )}
              </div>
            )}

            <div className="mt-[20px] flex justify-end gap-[8px]">
              <button
                type="button"
                disabled={pending}
                className="rounded-full border border-border px-[16px] py-[8px] text-[12px] hover:bg-muted disabled:opacity-50"
                onClick={onClose}
              >
                {t("Cerrar")}
              </button>
              <button
                type="button"
                disabled={pending || !canActivate}
                className="primary flex min-w-[112px] items-center justify-center gap-[7px] px-[16px] py-[8px] text-[12px] disabled:opacity-50"
                onClick={() =>
                  onActivate({ organizationAddress, versionId })
                }
              >
                {pending ? (
                  <RefreshCw className="h-[14px] w-[14px] animate-spin" />
                ) : (
                  <Power className="h-[14px] w-[14px]" />
                )}
                {t("Activar")}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function DeploymentField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-[6px]">
      <span className="block text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
