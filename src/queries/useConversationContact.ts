import { useQuery } from "@tanstack/react-query";
import {
  supabase,
  type ContactAddressRow,
  type ContactRow,
} from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import {
  createContactLookupBatcher,
  type ContactLookupScope,
} from "@/utils/ContactLookupBatcher";
import {
  canRecoverContactLookup,
  CONTACT_LOOKUP_STALE_MS,
  conversationContactKey,
} from "@/utils/ConversationContactCache";
import { recoverRead } from "@/utils/ReadRecoveryUtils";

type ConversationContact = Pick<
  ContactAddressRow,
  "organization_id" | "address" | "contact_id" | "extra"
> & {
  contact: Pick<
    ContactRow,
    | "id"
    | "name"
    | "email"
    | "company"
    | "job_title"
    | "city"
    | "country"
    | "created_at"
  > | null;
};

function assertActiveScope(scope: ContactLookupScope) {
  const { activeOrgId, user } = useBoundStore.getState().ui;
  if (activeOrgId !== scope.organizationId || user?.id !== scope.userId)
    throw new DOMException("Contact lookup scope changed", "AbortError");
}

const loadContact = createContactLookupBatcher<ConversationContact>(
  async (scope, addresses, signal) => {
    const { data } = await recoverRead(() => {
      assertActiveScope(scope);
      return supabase
        .from("contacts_addresses")
        .select(
          "organization_id,address,contact_id,extra,contact:contacts(id,name,email,company,job_title,city,country,created_at)",
        )
        .eq("organization_id", scope.organizationId)
        .in("address", addresses)
        .limit(addresses.length)
        .abortSignal(signal)
        .throwOnError();
    }, signal);
    assertActiveScope(scope);
    return new Map(
      data
        .filter((row) => row.organization_id === scope.organizationId)
        .map((row) => [row.address, row]),
    );
  },
);

export function useConversationContact(address: string | null | undefined) {
  const userId = useBoundStore((state) => state.ui.user?.id);
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  return useQuery({
    queryKey: conversationContactKey(organizationId, userId, address),
    queryFn: ({ signal }) =>
      loadContact(
        { organizationId: organizationId!, userId: userId! },
        address!,
        signal,
      ),
    enabled: !!userId && !!organizationId && !!address,
    staleTime: CONTACT_LOOKUP_STALE_MS,
    // Retries are bounded at transport level, never multiplied by row count.
    retry: false,
    retryOnMount: false,
    refetchOnMount: (query) =>
      canRecoverContactLookup(query.state.errorUpdatedAt),
    refetchOnWindowFocus: (query) =>
      canRecoverContactLookup(query.state.errorUpdatedAt),
    refetchOnReconnect: (query) =>
      canRecoverContactLookup(query.state.errorUpdatedAt),
  });
}
