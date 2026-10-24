import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useInstagramSignup } from "@/queries/useInstagramSignup";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import {
  consumeInstagramOAuthContext,
  IG_INAPP_REDIRECT_PATH,
  IG_OAUTH_CONTEXT_KEY,
} from "@/utils/InstagramIntegrationUtils";

// Standalone (outside the `_auth` layout) so the return page is a bare
// "connecting" screen instead of the whole app shell.
export const Route = createFileRoute("/oauth/instagram")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    // Instagram sends `error=access_denied` when the user cancels/denies.
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: InstagramOAuthCallback,
});

function InstagramOAuthCallback() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { code, state, error } = Route.useSearch();
  const { mutate: signup } = useInstagramSignup();
  const [failed, setFailed] = useState(false);
  const ran = useRef(false);

  // The connect page redirected this same tab to Instagram and back, so the
  // token exchange runs here, bound to the initiating user and organization.
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // User canceled/denied: quietly return to the connect screen.
    if (error === "access_denied") {
      sessionStorage.removeItem(IG_OAUTH_CONTEXT_KEY);
      void navigate({ to: "/integrations/instagram/new", hash: "" });
      return;
    }

    if (error || !code || !state) {
      sessionStorage.removeItem(IG_OAUTH_CONTEXT_KEY);
      setFailed(true);
      return;
    }

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const context = consumeInstagramOAuthContext(
        sessionStorage,
        state,
        useBoundStore.getState().ui.activeOrgId,
        session?.user.id,
      );
      const redirect_uri = `${window.location.origin}${IG_INAPP_REDIRECT_PATH}`;
      signup(
        {
          code,
          redirect_uri,
          organization_id: context.organizationId,
          user_id: context.userId,
        },
        {
          onSuccess: (data: { address?: string }) => {
            const current = useBoundStore.getState().ui;
            if (
              current.activeOrgId !== context.organizationId ||
              current.user?.id !== context.userId
            )
              return;
            if (!data.address) {
              setFailed(true);
              return;
            }
            void navigate({
              to: "/integrations/instagram/$orgAddressId",
              params: { orgAddressId: data.address },
              hash: "",
            });
          },
          onError: () => setFailed(true),
        },
      );
    })().catch(() => setFailed(true));
  }, [code, state, error, signup, navigate]);

  return (
    <div className="flex flex-col gap-9 justify-center items-center bg-background text-foreground h-dvh w-screen">
      <img
        src="/SocialConnectLarge.png"
        alt="Social Connect"
        className="h-[180px] w-[180px] object-contain"
      />

      <div className="flex flex-col items-center gap-4 w-[320px] text-center">
        {failed ? (
          <>
            <p className="text-destructive font-medium">
              {t("No se pudo conectar la cuenta de Instagram.")}
            </p>
            <button
              type="button"
              className="text-primary font-medium cursor-pointer"
              onClick={() =>
                navigate({ to: "/integrations/instagram/new", hash: "" })
              }
            >
              {t("Reintentar")}
            </button>
          </>
        ) : (
          <p className="text-muted-foreground">
            {t("Conectando tu cuenta de Instagram...")}
          </p>
        )}
      </div>
    </div>
  );
}
