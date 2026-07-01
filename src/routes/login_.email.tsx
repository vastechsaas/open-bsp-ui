import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/supabase/client";

export const Route = createFileRoute("/login_/email")({
  validateSearch: (search): { redirect?: string } => ({
    redirect: (search.redirect as string) || undefined,
  }),
  component: EmailLogin,
});

function EmailLogin() {
  const { redirect } = Route.useSearch();
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogIn(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(t("¡Credenciales inválidas!"));
      setLoading(false);
      return;
    }

    void navigate({ to: redirect || "/" });
  }

  return (
    <div className="flex flex-col gap-9 justify-center items-center bg-background text-foreground h-dvh w-screen">
      <img
        src="/SocialConnectLarge.png"
        alt="Social Connect"
        className="h-[180px] w-[180px] object-contain"
      />

      <form onSubmit={handleLogIn} className="login-form w-[250px]">
        <label>
          <div className="label">{t("Correo electrónico")}</div>
          <input
            className="text"
            type="email"
            autoComplete="email"
            required
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
        </label>

        <label>
          <div className="label">{t("Contraseña")}</div>
          <input
            className="text"
            type="password"
            autoComplete="current-password"
            required
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
        </label>

        {message && (
          <div className="self-center text-destructive text-md">{message}</div>
        )}

        <button
          type="submit"
          className="primary w-full mt-[16px]"
          disabled={loading}
        >
          {loading ? t("Cargando...") : t("Entrar")}
        </button>
      </form>
    </div>
  );
}
