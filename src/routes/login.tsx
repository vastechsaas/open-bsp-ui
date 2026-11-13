import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import LegalLinks from "@/components/LegalLinks";
import { useTranslation } from "@/hooks/useTranslation";
import { loadTranslations } from "@/i18n/translations";
import useBoundStore from "@/stores/useBoundStore";
import { supabase } from "@/supabase/client";
import { signInErrorMessage } from "@/utils/SignInUtils";
import styles from "./login.module.css";

export const Route = createFileRoute("/login")({
  beforeLoad: () => loadTranslations("en"),
  component: SignIn,
});

function Brand() {
  const { translate: t } = useTranslation("en");
  return (
    <Link
      to="/"
      aria-label={t("Volver al inicio de Social Connect")}
      className={styles.brand}
    >
      <span className={styles.mark} aria-hidden="true">
        <img src="/SocialConnectSmall.png" alt="" width={1024} height={1024} />
      </span>
      <span>Social Connect</span>
    </Link>
  );
}

function SignIn() {
  const { translate: t } = useTranslation("en");
  const router = useRouter();
  const userId = useBoundStore((state) => state.ui.user?.id);
  const inFlight = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    // The root loader owns navigation. The Auth listener only updates the
    // session here, including when another tab signs in.
    if (userId) void router.invalidate();
  }, [router, userId]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || userId) return;

    // Read the native inputs so saved-password autofill works even without a
    // React change event. Credentials never leave the request/component.
    const form = new FormData(event.currentTarget);
    const email = form.get("email");
    const password = form.get("password");
    if (typeof email !== "string" || typeof password !== "string") return;
    inFlight.current = true;
    setSubmitting(true);
    setError(undefined);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (!error && data.session) return;
      setError(signInErrorMessage(error ?? {}));
    } catch {
      setError(signInErrorMessage({ status: 0 }));
    }

    inFlight.current = false;
    setSubmitting(false);
  }

  return (
    <main className={styles.page}>
      <aside className={styles.hero}>
        <Brand />
        <div className={styles.heroContent}>
          <p className={styles.heroTitle}>
            {t("Una sola bandeja.")}
            <br />
            {t("Mejores conversaciones.")}
          </p>
          <svg
            className={styles.illustration}
            viewBox="0 0 440 290"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="#d3997e"
              d="M168 24h195a30 30 0 0 1 30 30v80a30 30 0 0 1-25 29v27l-38-26H168a30 30 0 0 1-30-30V54a30 30 0 0 1 30-30Z"
            />
            <path
              d="M176 77h177m-177 31h137"
              stroke="#f5dcc8"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              fill="#f4eddf"
              d="M62 137h190a30 30 0 0 1 30 30v67a30 30 0 0 1-30 30H91l-33 22v-22a30 30 0 0 1-26-30v-67a30 30 0 0 1 30-30Z"
            />
            <path
              d="M77 187h158m-158 30h113"
              stroke="#a89b88"
              strokeWidth="10"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </aside>

      <section className={styles.panel} aria-labelledby="sign-in-title">
        <div className={styles.mobileBrand}>
          <Brand />
        </div>
        <div className={styles.formArea}>
          <h1 id="sign-in-title" className={styles.title}>
            {t("Iniciar sesión")}
          </h1>
          <p className={styles.description}>
            {t("Ingresa tu correo electrónico y contraseña para continuar.")}
          </p>

          <form
            className={styles.form}
            onSubmit={signIn}
            aria-busy={submitting}
          >
            <div className={styles.field}>
              <label htmlFor="sign-in-email">
                {t("Dirección de correo electrónico")}
              </label>
              <input
                id="sign-in-email"
                className={styles.input}
                name="email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={t("nombre@empresa.com")}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="sign-in-password">{t("Contraseña")}</label>
              <div className={styles.passwordField}>
                <input
                  id="sign-in-password"
                  className={styles.input}
                  name="password"
                  type={passwordVisible ? "text" : "password"}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={t("Ingresa tu contraseña")}
                  required
                />
                <button
                  className={styles.reveal}
                  type="button"
                  aria-controls="sign-in-password"
                  aria-label={t(
                    passwordVisible
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña",
                  )}
                  onClick={() => setPasswordVisible((visible) => !visible)}
                >
                  {passwordVisible ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className={styles.error} role="alert">
                {t(error)}
              </p>
            )}

            <button
              className={styles.submit}
              type="submit"
              disabled={submitting || !!userId}
            >
              {submitting ? t("Iniciando sesión…") : t("Iniciar sesión")}
            </button>
          </form>
        </div>
        <LegalLinks className={styles.legal} />
      </section>
    </main>
  );
}
