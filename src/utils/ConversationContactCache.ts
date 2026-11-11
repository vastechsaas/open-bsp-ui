import type { QueryClient } from "@tanstack/react-query";
import type { ContactLookupScope } from "./ContactLookupBatcher";

const CONTACT_RECOVERY_COOLDOWN_MS = 10_000;
export const CONTACT_LOOKUP_STALE_MS = 60_000;

export const conversationContactRoot = (organizationId: string | null) =>
  [organizationId, "conversation-contact-batch"] as const;

export const conversationContactKey = (
  organizationId: string | null,
  userId: string | undefined,
  address: string | null | undefined,
) => [...conversationContactRoot(organizationId), userId, address] as const;

export function canRecoverContactLookup(errorUpdatedAt: number) {
  return Date.now() - errorUpdatedAt >= CONTACT_RECOVERY_COOLDOWN_MS;
}

export function invalidateConversationContacts(
  client: QueryClient,
  organizationId: string | null,
  targets: {
    contactIds?: readonly string[];
    addresses?: readonly (string | null | undefined)[];
    includeUnlinked?: boolean;
  },
) {
  const ids = new Set(targets.contactIds);
  const addresses = new Set(targets.addresses?.filter(Boolean));
  return client.invalidateQueries({
    queryKey: conversationContactRoot(organizationId),
    predicate: (query) => {
      const address = query.queryKey[3];
      const data = query.state.data as
        | { contact_id?: string | null }
        | null
        | undefined;
      return (
        (typeof address === "string" && addresses.has(address)) ||
        (!!data?.contact_id && ids.has(data.contact_id)) ||
        // New canonical contacts can link to previously unlinked addresses.
        (!!targets.includeUnlinked && data !== undefined && !data?.contact_id)
      );
    },
  });
}

export function recoverConversationContacts(
  client: QueryClient,
  scope: ContactLookupScope,
) {
  return client.refetchQueries(
    {
      queryKey: [
        ...conversationContactRoot(scope.organizationId),
        scope.userId,
      ],
      type: "active",
      stale: true,
      predicate: (query) => canRecoverContactLookup(query.state.errorUpdatedAt),
    },
    { cancelRefetch: false },
  );
}
