import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { GoogleOutlined } from "@ant-design/icons";
// import { GithubOutlined } from "@ant-design/icons";

type OAuthProvider = "google" | "github";

export const Route = createFileRoute("/login")({
  validateSearch: (search): { redirect?: string } => ({
    redirect: (search.redirect as string) || undefined,
  }),
  component: Login,
});

function Login() {
  const { redirect } = Route.useSearch();
  const { translate: t } = useTranslation();
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
      <img
        src="/SocialConnectLarge.png"
        alt="Social Connect"
        className="h-[180px] w-[180px] object-contain"
      />

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
    </div>
  );
}
