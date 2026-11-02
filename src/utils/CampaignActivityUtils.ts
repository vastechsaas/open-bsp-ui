export const activityLabels: Record<string, string> = {
  campaign_started: "Campaña iniciada",
  campaign_paused: "Campaña pausada",
  campaign_resumed: "Campaña reanudada",
  dispatch_finished: "Envíos finalizados",
  submission_started: "Envío iniciado",
  accepted: "Aceptado por Meta",
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
  failed: "Error de entrega",
  dispatch_failed: "Error de envío",
  needs_review: "Requiere revisión",
  cancelled: "Cancelado",
  retry_scheduled: "Reintento programado",
  waiting: "En espera",
};
export const activityReasons: Record<string, string> = {
  scheduled: "Inicio programado",
  sending_window: "Fuera del horario de envío",
  daily_allowance: "Cupo diario agotado",
  number_rate: "Límite por minuto",
  recipient_frequency: "Límite por destinatario",
  policy_unavailable: "Política no disponible",
  manual_pause: "Pausa manual",
  completed: "Procesamiento finalizado",
  cancelled: "Cancelado",
  expired: "Vencida",
};
export function safeActivityCode(code: string | null) {
  return code && /^[a-zA-Z0-9_.:-]{1,100}$/.test(code) ? code : null;
}
export function receiptSummary(value: unknown) {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const count = (key: string): number => {
    const value = record[key];
    return typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0
      ? value
      : 0;
  };
  return {
    sent: count("sent"),
    delivered: count("delivered"),
    read: count("read"),
    delivery_failed: count("delivery_failed"),
  };
}
export function campaignActivityPage<T extends { total_count: number }>(
  rows: T[],
) {
  return { rows, total: rows[0]?.total_count ?? 0 };
}
