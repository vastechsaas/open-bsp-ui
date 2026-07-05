import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { GoogleOutlined } from "@ant-design/icons";
import { loadTranslations } from "@/i18n/translations";
import LegalLinks from "@/components/LegalLinks";
// import { GithubOutlined } from "@ant-design/icons";

type OAuthProvider = "google" | "github";

export const Route = createFileRoute("/login")({
  beforeLoad: () => loadTranslations("en"),
  validateSearch: (search): { redirect?: string } => ({
    redirect: (search.redirect as string) || undefined,
  }),
  component: Login,
});

function Login() {
  const { redirect } = Route.useSearch();
  const { translate: t } = useTranslation("en");
  const navigate = useNavigate();

  async function handleLogInWithOauth(provider: OAuthProvider) {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + (redirect || "/"),
      },
    });
  }

  return (
    <div className="flex flex-col gap-9 justify-center items-center bg-background text-foreground h-dvh w-screen">
      <a
        href="/"
        aria-label="Back to Social Connect home"
        className="rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <img
          src="/SocialConnectLarge.png"
          alt="Social Connect"
          className="h-[180px] w-[180px] object-contain"
        />
      </a>

      <div className="flex flex-col gap-3 w-[250px]">
        <button
          type="button"
          className="primary bg-blue-500 hover:bg-blue-400 text-white w-full border-none"
          onClick={() => handleLogInWithOauth("google")}
        >
          <GoogleOutlined /> {t("Continuar con Google")}
        </button>

        <button
          type="button"
          className="primary w-full"
          onClick={() => {
            void navigate({
              to: "/login/email",
              search: { redirect },
            });
          }}
        >
          {t("Continuar con correo electrónico")}
        </button>

        {/* GitHub OAuth is intentionally hidden for this deployment.
        <button
          type="button"
          className="primary bg-gray-900 hover:bg-gray-800 text-white w-full border-none"
          onClick={() => handleLogInWithOauth("github")}
        >
          <GithubOutlined /> {t("Continuar con GitHub")}
        </button>
        */}
      </div>

      <LegalLinks className="absolute bottom-5 px-4" />
    </div>
  );
}
