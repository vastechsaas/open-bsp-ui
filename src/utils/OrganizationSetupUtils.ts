import type { AccountSetupMode } from "./AccountOnboardingUtils";
import {
  buildOrganizationProvisioningPayload,
  type OrganizationProvisioningDraft,
} from "./OrganizationProvisioningUtils";
export type TransientSetupSecret = {
  password: string;
  confirmation: string;
  confirmed: boolean;
};
export type OrganizationSetupPerson = {
  member_id: string;
  client_key: string;
  name: string;
  email: string;
  role: string;
  mode: AccountSetupMode;
  operation_id: string | null;
  status: string;
  failure_code: string | null;
  invitation_sent_at: string | null;
};
export type OrganizationSetupResult = {
  version: 2;
  provisioning_id: string;
  organization_id: string;
  organization_name: string;
  status: string;
  people: OrganizationSetupPerson[];
  has_remaining_work: boolean;
};
export function buildOrganizationSetupPayload(
  draft: OrganizationProvisioningDraft,
  ownerMode: AccountSetupMode,
  requestId: string,
) {
  const legacy = buildOrganizationProvisioningPayload(draft, requestId);
  return {
    ...legacy,
    version: 2 as const,
    action: "create" as const,
    owner: { ...legacy.owner, mode: ownerMode },
    members: legacy.members.map((member, index) => ({
      ...member,
      client_key: draft.members[index].id,
      mode: draft.members[index].setupMode ?? "invitation",
    })),
  };
}
export const setupPersonReady = (person: OrganizationSetupPerson) =>
  ["completed", "invitation_sent", "pending_membership"].includes(
    person.status,
  );
export function directSetupValid(secret: TransientSetupSecret | undefined) {
  return (
    !!secret?.confirmed &&
    !!secret.password &&
    secret.password === secret.confirmation
  );
}
export function setupPersonLabel(person: OrganizationSetupPerson) {
  if (person.status === "pending_membership")
    return "Membresía pendiente creada";
  if (person.status === "completed") return "Acceso configurado";
  if (person.status === "invitation_sent") return "Invitación enviada";
  if (person.status === "failed") return "La configuración requiere atención";
  if (person.status === "processing") return "Configuración en curso";
  return "Pendiente de configuración";
}
