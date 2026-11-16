import type { MessageRow } from "@/supabase/client";

export function attachmentRecovery(message: MessageRow) {
  if (
    message.service !== "whatsapp" ||
    message.direction !== "incoming" ||
    message.content.type !== "file" ||
    !/^[0-9]{1,40}$/.test(message.content.file.uri)
  )
    return null;

  switch (message.content.attachment_recovery) {
    case "pending":
      return { label: "Obteniendo el archivo adjunto…", retry: false };
    case "failed":
      return { label: "No se pudo descargar el archivo adjunto.", retry: true };
    case "unavailable":
      return {
        label: "Pedile al cliente que reenvíe el archivo adjunto.",
        retry: false,
      };
    case "credentials":
      return {
        label: "Revisá la conexión de WhatsApp antes de reintentar.",
        retry: true,
      };
    case "storage":
      return {
        label: "No se pudo guardar el adjunto. Revisá el almacenamiento.",
        retry: true,
      };
    case "too_large":
      return {
        label: "El archivo adjunto supera el límite de tamaño.",
        retry: false,
      };
    default:
      return { label: "Archivo adjunto no disponible.", retry: false };
  }
}
