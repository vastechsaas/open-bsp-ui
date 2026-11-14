import { useEffect, useRef } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import styles from "./WorkspaceArrivalScreen.module.css";

export default function WorkspaceArrivalScreen() {
  const { translate: t } = useTranslation("en");
  const screen = useRef<HTMLElement>(null);

  useEffect(() => {
    screen.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      ref={screen}
      tabIndex={-1}
      aria-labelledby="workspace-arrival-title"
      className={styles.screen}
      data-testid="workspace-arrival-screen"
    >
      <div className={styles.stack} role="status">
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            <img
              src="/SocialConnectSmall.png"
              alt=""
              width={1024}
              height={1024}
            />
          </span>
          <span>Social Connect</span>
        </div>
        <h1 id="workspace-arrival-title">
          {t("Cargando el espacio de trabajo…")}
        </h1>
        <p>{t("Estamos preparando todo para vos.")}</p>
        <div className={styles.track} aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  );
}
