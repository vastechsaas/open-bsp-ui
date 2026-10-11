import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import {
  inboxVisibilityBatches,
  mergeInboxVisibility,
  type InboxVisibilityBatch,
} from "@/utils/SupportInboxUtils";

export const supportInboxKey = (
  organizationId: string | null,
  userId?: string,
) => [organizationId, "support-inbox", userId] as const;

function combineVisibility(results: UseQueryResult<InboxVisibilityBatch>[]) {
  return {
    confirmed: results.flatMap((result) => (result.data ? [result.data] : [])),
    isPending: results.some((result) => result.isPending),
    isError: results.some((result) => result.isError),
    refetch: results.map((result) => result.refetch),
  };
}

export function useSupportInboxVisibility(ids: Iterable<string>) {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const scope = JSON.stringify([organizationId, userId]);
  const [confirmed, setConfirmed] = useState({
    scope,
    rows: new Map<string, boolean>(),
  });
  const results = useQueries({
    queries: inboxVisibilityBatches(ids).map((batch) => ({
      queryKey: [...supportInboxKey(organizationId, userId), batch],
      enabled: !!organizationId && !!userId,
      staleTime: 30_000,
      gcTime: 0,
      retry: false,
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const { data, error } = await supabase
          .rpc("get_support_inbox_visibility", {
            p_organization_id: organizationId!,
            p_conversation_ids: batch,
          })
          .abortSignal(signal);
        if (error) throw error;
        return { ids: batch, rows: data };
      },
    })),
    combine: combineVisibility,
  });

  useEffect(() => {
    setConfirmed((previous) => ({
      scope,
      rows: mergeInboxVisibility(
        previous.scope === scope ? previous.rows : new Map(),
        results.confirmed,
      ),
    }));
  }, [scope, results.confirmed]);

  const rows = mergeInboxVisibility(
    confirmed.scope === scope ? confirmed.rows : new Map(),
    results.confirmed,
  );
  return {
    visibleIds: new Set(
      [...rows].filter(([, visible]) => visible).map(([id]) => id),
    ),
    isPending: results.isPending,
    isError: results.isError,
    retry: () => Promise.all(results.refetch.map((refetch) => refetch())),
  };
}
