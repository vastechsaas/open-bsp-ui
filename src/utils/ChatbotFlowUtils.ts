export type ChatbotFlowStatus = "active" | "archived";

export function isChatbotWorkspacePath(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  return normalizedPath === "/chatbots";
}

export function getChatbotFlowStatusLabel(status: string) {
  if (status === "active") return "Activo";
  if (status === "archived") return "Archivado";
  return status;
}

export function getChatbotFlowDuplicateName(name: string) {
  return `${name.trim()} (copia)`;
}

export function getChatbotFlowVersionSummary({
  draftVersion,
  publishedVersion,
}: {
  draftVersion: number | null;
  publishedVersion: number | null;
}) {
  return {
    draft: draftVersion ? `v${draftVersion}` : "—",
    published: publishedVersion ? `v${publishedVersion}` : "Sin publicar",
  };
}
