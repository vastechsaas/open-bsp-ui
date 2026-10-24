import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import SectionHeader from "@/components/SectionHeader";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import { getInstagramAuthorizeUrl } from "@/queries/useInstagramSignup";
import useBoundStore from "@/stores/useBoundStore";
import {
  IG_INAPP_REDIRECT_PATH,
  IG_OAUTH_CONTEXT_KEY,
  type InstagramOAuthContext,
} from "@/utils/InstagramIntegrationUtils";

export const Route = createFileRoute("/_auth/integrations/instagram/new")({
  component: InstagramNew,
});

// Where Instagram redirects back to after the user authorizes. Must match a
// redirect URI registered in the Meta app dashboard. It's a standalone route
// (not under `_auth`) so the return page is a bare "connecting" screen rather
// than the whole app shell.

function InstagramNew() {
  const { translate: t } = useTranslation();
  const { data: currentAgent } = useCurrentAgent();
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const isOwner = currentAgent?.extra?.role === "owner";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Instagram Business Login is a plain redirect OAuth (no SDK/popup like
  // WhatsApp). We redirect the whole tab so the token exchange happens back in
  // this same tab — scoped to the active org — with no fragile cross-tab
  // handoff (which COOP + background-tab throttling make unreliable).
  const connect = async () => {
    setError(false);
    setLoading(true);

    try {
      if (!isOwner || !organizationId || !userId)
        throw new Error("Unauthorized");
      const state = crypto.randomUUID();
      const context: InstagramOAuthContext = {
        state,
        organizationId,
        userId,
        createdAt: Date.now(),
      };
      // Per-tab state is bound to the initiating account AND organization.
      sessionStorage.setItem(IG_OAUTH_CONTEXT_KEY, JSON.stringify(context));
      const redirect_uri = `${window.location.origin}${IG_INAPP_REDIRECT_PATH}`;
      const url = await getInstagramAuthorizeUrl(redirect_uri, state);
      const current = useBoundStore.getState().ui;
      if (
        current.activeOrgId !== organizationId ||
        current.user?.id !== userId
      ) {
        throw new Error("Account changed");
      }
      window.location.assign(url);
    } catch {
      sessionStorage.removeItem(IG_OAUTH_CONTEXT_KEY);
      setLoading(false);
      setError(true);
    }
  };

  return (
    <>
      <SectionHeader title={t("Conectar Instagram")} />

      <SectionBody>
        <div className="instructions">
          <p>
            {t(
              "Para conectar Instagram a la plataforma, iniciá sesión con la cuenta de Instagram profesional (empresa o creador) que querés conectar.",
            )}
          </p>
          <ul>
            <li>
              {t(
                "La cuenta debe ser profesional (empresa o creador) y tener los mensajes habilitados.",
              )}
            </li>
            <li>
              {t(
                "Vas a ser redirigido a Instagram para autorizar y luego volverás a la plataforma.",
              )}
            </li>
          </ul>
          {error && (
            <p className="text-destructive font-medium">
              {t("No se pudo conectar la cuenta de Instagram.")}
            </p>
          )}
        </div>
      </SectionBody>

      <SectionFooter>
        <Button
          loading={loading}
          disabled={!isOwner}
          disabledReason={t("Requiere permisos de propietario")}
          className="primary bg-[#E1306C] hover:bg-[#E1306C]/90 text-white w-full"
          onClick={connect}
        >
          {t("Continuar con Instagram")}
        </Button>
      </SectionFooter>
    </>
  );
}
