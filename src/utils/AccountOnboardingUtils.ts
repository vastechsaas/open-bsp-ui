export type AccountSetupMode = "invitation" | "direct" | "pending";
export type AccountSetupStatus = {
  operation_id: string;
  member_id: string;
  mode: string;
  status: string;
  failure_code: string | null;
  invitation_sent_at: string | null;
};
export function accountSetupLabel(status: AccountSetupStatus) {
  if (status.status === "revoked") return "Configuración cancelada";
  if (status.status === "completed") return "Acceso configurado";
  if (status.failure_code) return "La configuración requiere atención";
  if (status.invitation_sent_at) return "Invitación enviada";
  return "Configuración en curso";
}
export function accountSetupError(code: string) {
  if (code.includes("CAPACITY_REACHED"))
    return "La capacidad de agentes está completa";
  if (code.includes("MEMBERSHIP_EXISTS"))
    return "Ya existe una membresía o invitación para este correo en la organización.";
  if (code.includes("TEAM_MEMBER_READ_ONLY"))
    return "Administrador y Miembro son roles de solo lectura en esta pantalla.";
  if (code.includes("EMAIL_IN_USE"))
    return "El correo electrónico ya está en uso.";
  if (code.includes("EMAIL_RESERVED"))
    return "Ya hay una configuración en curso para este correo.";
  if (code.includes("WEAK_PASSWORD"))
    return "La contraseña no cumple la política de seguridad del proyecto.";
  if (code.includes("PASSWORD_REENTRY_REQUIRED"))
    return "Volvé a ingresar la contraseña para reintentar. No se guardó ninguna contraseña.";
  if (code.includes("SMTP_FAILED"))
    return "No se pudo enviar el correo. Revisá la configuración SMTP antes de reintentar.";
  if (code.includes("DELIVERY_UNKNOWN"))
    return "El envío no pudo confirmarse. Reintentá la misma operación; no crees otra membresía.";
  if (code.includes("BUSY"))
    return "Hay una operación en curso. Esperá un momento y volvé a consultar.";
  if (code.includes("RATE_LIMIT"))
    return "Esperá un minuto antes de reenviar la invitación.";
  if (code.includes("LINK_INVALID") || code.includes("REVOKED"))
    return "Este enlace venció, fue cancelado o ya se utilizó. Pedí una nueva invitación.";
  if (code.includes("NOT_CONFIGURED"))
    return "La configuración de invitaciones no está disponible. Contactá al administrador.";
  if (code.includes("TEAM_MEMBER_STALE"))
    return "La membresía cambió. Actualizá la lista antes de continuar.";
  return "No se pudo completar la configuración. Consultá el estado y reintentá.";
}

// Capture once into isolated tab storage, then remove authentication parameters
// before rendering. Never persist them in the app store, analytics or query keys.
export function readSetupLink(url: URL, storage: Storage) {
  const key = "platform-account-setup-link";
  if (url.searchParams.has("context")) {
    const value = {
      operation_id: url.searchParams.get("operation_id") ?? "",
      context: url.searchParams.get("context") ?? "",
      token_hash: url.searchParams.get("token_hash") ?? "",
      type: url.searchParams.get("type") ?? "invite",
    };
    storage.setItem(key, JSON.stringify(value));
    return value;
  }
  const saved = storage.getItem(key);
  return saved
    ? (JSON.parse(saved) as {
        operation_id: string;
        context: string;
        token_hash: string;
        type: string;
      })
    : null;
}
