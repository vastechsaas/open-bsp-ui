import { createFileRoute } from "@tanstack/react-router";
import { createClient, type Session } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { accountOnboardingRequest } from "@/queries/useAccountOnboarding";
import {
  accountSetupError,
  readSetupLink,
} from "@/utils/AccountOnboardingUtils";
import type { AccountSetupStatus } from "@/utils/AccountOnboardingUtils";
import {
  platformMemberRoleLabel,
  type PlatformMemberRole,
} from "@/utils/PlatformTeamMemberUtils";

export const Route = createFileRoute("/onboard/set-password")({
  component: SetPassword,
});
type Preview = {
  organization_name: string;
  email: string;
  role: PlatformMemberRole;
  user_id: string;
};

function SetPassword() {
  const { translate: t } = useTranslation();
  const [link] = useState(() => {
    const value = readSetupLink(new URL(window.location.href), sessionStorage);
    history.replaceState(null, "", window.location.pathname);
    return value;
  });
  const [client] = useState(() =>
    createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      {
        auth: {
          storage: sessionStorage,
          storageKey: "platform-account-setup-auth",
          detectSessionInUrl: false,
          autoRefreshToken: true,
          persistSession: true,
        },
      },
    ),
  );
  const [preview, setPreview] = useState<Preview>();
  const [session, setSession] = useState<Session | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    if (!link) {
      setError("ONBOARDING_LINK_INVALID");
      return;
    }
    void accountOnboardingRequest<Preview>(
      {
        action: "preview",
        operation_id: link.operation_id,
        context: link.context,
      },
      "",
      controller.signal,
    )
      .then(async (result) => {
        if (controller.signal.aborted) return;
        const existing = (await supabase.auth.getSession()).data.session;
        if (controller.signal.aborted) return;
        setBlocked(!!existing && existing.user.id !== result.user_id);
        setPreview(result);
        const isolated = (await client.auth.getSession()).data.session;
        if (!controller.signal.aborted)
          setSession(isolated?.user.id === result.user_id ? isolated : null);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError((e as Error).message);
      });
    return () => {
      controller.abort();
      void client.auth.stopAutoRefresh();
    };
  }, [client, link]);
  const verify = async () => {
    if (!link || !preview || blocked || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      // Recheck immediately before token consumption; never run automatically on
      // page load (email link scanners must not consume the invitation).
      const existing = (await supabase.auth.getSession()).data.session;
      if (existing && existing.user.id !== preview.user_id) {
        setBlocked(true);
        return;
      }
      const { data, error: authError } = await client.auth.verifyOtp({
        token_hash: link.token_hash,
        type: link.type === "magiclink" ? "magiclink" : "invite",
      });
      if (authError || data.user?.id !== preview.user_id || !data.session)
        throw new Error("ONBOARDING_LINK_INVALID");
      setSession(data.session);
      sessionStorage.setItem(
        "platform-account-setup-link",
        JSON.stringify({ ...link, token_hash: "" }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  const complete = async () => {
    if (
      !session ||
      !link ||
      !preview ||
      password !== confirmation ||
      inFlight.current
    )
      return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const current = (await supabase.auth.getSession()).data.session;
      if (current && current.user.id !== preview.user_id) {
        setBlocked(true);
        return;
      }
      const active = (await client.auth.getSession()).data.session;
      if (!active || active.user.id !== preview.user_id)
        throw new Error("ONBOARDING_LINK_INVALID");
      const result = await accountOnboardingRequest<AccountSetupStatus>(
        {
          action: "complete",
          operation_id: link.operation_id,
          context: link.context,
          password,
        },
        active.access_token,
      );
      if (result.status !== "completed")
        throw new Error("ONBOARDING_UNAVAILABLE");
      // Initial password creation may rotate Auth sessions. Obtain a fresh
      // recipient session instead of reusing the invitation refresh token.
      const { data: login, error: loginError } =
        await client.auth.signInWithPassword({
          email: preview.email,
          password,
        });
      if (loginError || !login.session)
        throw new Error("ONBOARDING_UNAVAILABLE");
      const beforeTransfer = (await supabase.auth.getSession()).data.session;
      if (beforeTransfer && beforeTransfer.user.id !== preview.user_id) {
        setBlocked(true);
        return;
      }
      setPassword("");
      setConfirmation("");
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: login.session.access_token,
        refresh_token: login.session.refresh_token,
      });
      if (sessionError) throw sessionError;
      sessionStorage.removeItem("platform-account-setup-link");
      sessionStorage.removeItem("platform-account-setup-auth");
      // Normal workspace initialization selects an accepted organization and
      // applies its existing role-based landing and permissions.
      window.location.assign("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-5 text-foreground">
      <section className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-popover p-6 shadow-lg">
        <h1 className="text-xl font-semibold">
          {t("Establecer contraseña y unirme")}
        </h1>
        {preview && (
          <p className="text-sm">
            {preview.organization_name}
            <br />
            {preview.email} · {t(platformMemberRoleLabel(preview.role))}
          </p>
        )}
        {blocked ? (
          <p role="alert" className="text-sm text-amber-600">
            {t(
              "Hay otra cuenta abierta. Usá una ventana privada o cerrá sesión en esa cuenta antes de abrir la invitación.",
            )}
          </p>
        ) : !session ? (
          <button
            type="button"
            disabled={!preview || pending}
            onClick={() => void verify()}
            className="primary px-4 py-2 disabled:opacity-50"
          >
            {t(pending ? "Verificando…" : "Verificar invitación")}
          </button>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void complete();
            }}
          >
            <label className="block text-sm">
              {t("Contraseña")}
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 h-10 w-full rounded border border-input bg-background px-3"
              />
            </label>
            <label className="block text-sm">
              {t("Confirmar contraseña")}
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="mt-2 h-10 w-full rounded border border-input bg-background px-3"
              />
            </label>
            <button
              type="submit"
              disabled={pending || !password || password !== confirmation}
              className="primary px-4 py-2 disabled:opacity-50"
            >
              {t(pending ? "Guardando…" : "Establecer contraseña y unirme")}
            </button>
          </form>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {t(accountSetupError(error))}
          </p>
        )}
      </section>
    </main>
  );
}
