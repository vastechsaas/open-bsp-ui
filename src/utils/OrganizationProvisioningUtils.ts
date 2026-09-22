export type OrganizationProvisioningRole =
  | "owner"
  | "admin"
  | "supervisor"
  | "member"
  | "agent";

export type OrganizationProvisioningMember = {
  id: string;
  name: string;
  email: string;
  role: OrganizationProvisioningRole;
};

export type OrganizationProvisioningDraft = {
  organizationName: string;
  ownerName: string;
  ownerEmail: string;
  members: OrganizationProvisioningMember[];
  maxAgentSeats: string;
  storageQuotaGb: 25 | 50 | 75 | 100;
  autoAssign: boolean;
};

export type OrganizationProvisioningPayload = {
  request_id: string;
  organization_name: string;
  owner: { name: string; email: string };
  members: Array<{
    name: string;
    email: string;
    role: OrganizationProvisioningRole;
  }>;
  max_agent_seats: number | null;
  storage_quota_gb: 25 | 50 | 75 | 100;
  auto_assign: boolean;
};

export const ORGANIZATION_PROVISIONING_ROLES: ReadonlyArray<{
  value: OrganizationProvisioningRole;
  label: string;
}> = [
  { value: "owner", label: "Propietario" },
  { value: "admin", label: "Administrador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "member", label: "Miembro" },
  { value: "agent", label: "Agente" },
];

export function createOrganizationProvisioningDraft(): OrganizationProvisioningDraft {
  return {
    organizationName: "",
    ownerName: "",
    ownerEmail: "",
    members: [],
    maxAgentSeats: "",
    storageQuotaGb: 25,
    autoAssign: false,
  };
}

export function createOrganizationProvisioningMember(): OrganizationProvisioningMember {
  return {
    id: crypto.randomUUID(),
    name: "",
    email: "",
    role: "agent",
  };
}

export function validateOrganizationProvisioningDraft(
  draft: OrganizationProvisioningDraft,
): string[] {
  const errors: string[] = [];
  const validEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  if (!draft.organizationName.trim()) errors.push("organization_name");
  if (!draft.ownerName.trim()) errors.push("owner_name");
  if (!validEmail(draft.ownerEmail)) errors.push("owner_email");
  if (draft.members.length > 50) errors.push("member_limit");

  const emails = new Set<string>();
  if (validEmail(draft.ownerEmail))
    emails.add(draft.ownerEmail.trim().toLowerCase());
  for (const member of draft.members) {
    if (!member.name.trim() || !validEmail(member.email)) {
      errors.push(`member:${member.id}`);
    }
    const email = member.email.trim().toLowerCase();
    if (email && emails.has(email)) errors.push("duplicate_email");
    if (email) emails.add(email);
  }

  const capacity = draft.maxAgentSeats.trim()
    ? Number(draft.maxAgentSeats)
    : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) {
    errors.push("agent_capacity");
  }
  const initialCapacityUsers = draft.members.filter(
    (member) => member.role === "agent" || member.role === "supervisor",
  ).length;
  if (capacity !== null && initialCapacityUsers > capacity) {
    errors.push("agent_capacity_exceeded");
  }

  return [...new Set(errors)];
}

export function buildOrganizationProvisioningPayload(
  draft: OrganizationProvisioningDraft,
  requestId: string,
): OrganizationProvisioningPayload {
  return {
    request_id: requestId,
    organization_name: draft.organizationName.trim(),
    owner: {
      name: draft.ownerName.trim(),
      email: draft.ownerEmail.trim().toLowerCase(),
    },
    members: draft.members.map(({ name, email, role }) => ({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
    })),
    max_agent_seats: draft.maxAgentSeats.trim()
      ? Number(draft.maxAgentSeats)
      : null,
    storage_quota_gb: draft.storageQuotaGb,
    auto_assign: draft.autoAssign,
  };
}

export function getOrganizationProvisioningFingerprint(
  payload: OrganizationProvisioningPayload,
) {
  const { request_id: _requestId, ...request } = payload;
  void _requestId;
  return JSON.stringify(request);
}
