import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import type { AccountSetupMode } from "@/utils/AccountOnboardingUtils";

export function useAccountSetupFields(
  initialMode: AccountSetupMode = "invitation",
) {
  const [mode, setMode] = useState<AccountSetupMode>(initialMode);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  return {
    mode,
    setMode,
    password,
    setPassword,
    confirmation,
    setConfirmation,
    confirmed,
    setConfirmed,
  };
}
export default function AccountSetupFields({
  fields,
  pending,
  lockedMode,
}: {
  fields: ReturnType<typeof useAccountSetupFields>;
  pending: boolean;
  lockedMode?: boolean;
}) {
  const { translate: t } = useTranslation();
  return (
    <fieldset disabled={pending} className="space-y-3">
      {!lockedMode && (
        <label className="block text-sm font-medium">
          {t("Configurar acceso")}
          <select
            className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3"
            value={fields.mode}
            onChange={(e) => {
              fields.setMode(e.target.value as AccountSetupMode);
              fields.setPassword("");
              fields.setConfirmation("");
              fields.setConfirmed(false);
            }}
          >
            <option value="invitation">
              {t("Enviar invitación por correo")}
            </option>
            <option value="direct">{t("Crear con correo y contraseña")}</option>
            <option value="pending" hidden disabled>
              {t("Crear solo membresía pendiente")}
            </option>
          </select>
        </label>
      )}
      {fields.mode === "pending" ? (
        <p className="text-sm text-muted-foreground">
          {t(
            "Solo se crea una membresía pendiente. No se envía correo ni se crea una cuenta de acceso.",
          )}
        </p>
      ) : fields.mode === "invitation" ? (
        <p className="text-sm text-muted-foreground">
          {t(
            "El destinatario establece su contraseña y se une mediante el enlace. Enviado no garantiza la entrega en la bandeja de entrada.",
          )}
        </p>
      ) : (
        <>
          <label className="block text-sm">
            {t("Contraseña")}
            <input
              autoComplete="new-password"
              type="password"
              required
              value={fields.password}
              onChange={(e) => fields.setPassword(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3"
            />
          </label>
          <label className="block text-sm">
            {t("Confirmar contraseña")}
            <input
              autoComplete="new-password"
              type="password"
              required
              value={fields.confirmation}
              onChange={(e) => fields.setConfirmation(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3"
            />
          </label>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={fields.confirmed}
              onChange={(e) => fields.setConfirmed(e.target.checked)}
            />
            {t(
              "Verifiqué el correo y el rol. No se enviará un correo para verificar al destinatario.",
            )}
          </label>
        </>
      )}
    </fieldset>
  );
}
