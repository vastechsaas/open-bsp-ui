export type IntegrationAvailability = {
  id: string;
  name: string;
  enabled: boolean;
  connected_count?: number;
};
export type IntegrationSettings = {
  revision: number;
  integrations: IntegrationAvailability[];
};

export type IntegrationOnboardingInfo = {
  valid?: boolean;
  organization_name: string;
  cause?: { code?: string };
};

export function integrationEnabled(
  settings: IntegrationSettings | undefined,
  id: string,
) {
  return (
    settings?.integrations.some((item) => item.id === id && item.enabled) ===
    true
  );
}

// Template operations remain accessible even when connection management is off.
export function managementIntegration(
  path: string,
): "whatsapp" | "instagram" | null {
  const segments = path.split("/").filter(Boolean);
  if (segments[0] === "whatsapp-manager") return "whatsapp";
  if (segments[0] !== "integrations") return null;
  if (segments[1] === "whatsapp") {
    if (segments[3] === "templates") return null;
    return "whatsapp";
  }
  return segments[1] === "instagram" ? "instagram" : null;
}

export function integrationSaveRows(settings: IntegrationSettings) {
  return settings.integrations.map(({ id, enabled }) => ({ id, enabled }));
}
