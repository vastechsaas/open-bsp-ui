export const NOTIFICATION_TYPES = [
  {
    type: "conversation_assigned",
    label: "Conversación asignada",
    description:
      "Avisar al agente cuando se le asigna una conversación, manual o automáticamente.",
  },
  {
    type: "conversation_transferred_to_agent",
    label: "Transferencia a un agente",
    description: "Avisar al agente que recibe una conversación transferida.",
  },
  {
    type: "conversation_transferred_to_queue",
    label: "Transferencia a una cola",
    description:
      "Avisar a los miembros de la cola de destino, excepto a quien realiza la transferencia.",
  },
  {
    type: "private_note_mention",
    label: "Mención en una nota privada",
    description: "Avisar a las personas mencionadas en una nota privada.",
  },
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]["type"];

export function canManageNotificationPreferences(role?: string): boolean {
  return role === "owner";
}

export function notificationPreferenceKey(
  organizationId: string | null,
  userId?: string,
) {
  return [organizationId, "notification_preferences", userId] as const;
}
