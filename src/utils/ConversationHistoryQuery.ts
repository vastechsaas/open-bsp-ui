import {
  infiniteQueryOptions,
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query";

export const HISTORY_CACHE_TIME = 5 * 60_000;
export const HISTORY_LATEST_STALE_TIME = 30_000;

export const latestHistoryRoot = (organizationId: string | null) =>
  [organizationId, "conversation-history", "latest"] as const;

type Scope = {
  organizationId: string | null;
  userId?: string;
  conversationId: string | null;
  includeCampaigns: boolean;
};

/** Refresh the head independently: infinite-query refetches replay every page. */
export function conversationHistoryQueries<
  Cursor,
  Page extends { next_cursor?: Cursor },
>(
  scope: Scope,
  readPage: (cursor: Cursor | undefined, signal: AbortSignal) => Promise<Page>,
) {
  const suffix = [
    scope.userId,
    scope.conversationId,
    scope.includeCampaigns,
  ] as const;
  const latest = queryOptions({
    queryKey: [...latestHistoryRoot(scope.organizationId), ...suffix],
    queryFn: ({ signal }) => readPage(undefined, signal),
    staleTime: HISTORY_LATEST_STALE_TIME,
    gcTime: HISTORY_CACHE_TIME,
    retry: false,
  });
  const pages = infiniteQueryOptions({
    queryKey: [
      scope.organizationId,
      "conversation-history",
      "pages",
      ...suffix,
    ] as const,
    initialPageParam: undefined as Cursor | undefined,
    queryFn: ({ pageParam, signal, client }) =>
      pageParam === undefined
        ? (client.getQueryData<Page>([
            ...latestHistoryRoot(scope.organizationId),
            ...suffix,
          ]) ?? readPage(undefined, signal))
        : // TanStack's conditional context widens a generic cursor to unknown;
          // only our typed getNextPageParam can supply this value.
          readPage(pageParam as Cursor, signal),
    getNextPageParam: (page: Page) => page.next_cursor,
    staleTime: Infinity,
    gcTime: HISTORY_CACHE_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
  return { latest, pages };
}

/** Revocation must discard both the cached head and older protected pages. */
export function clearConversationHistory(
  client: QueryClient,
  organizationId: string,
  conversationIds: string[],
) {
  const ids = new Set(conversationIds);
  client.removeQueries({
    predicate: ({ queryKey }) =>
      queryKey[0] === organizationId &&
      queryKey[1] === "conversation-history" &&
      typeof queryKey[4] === "string" &&
      ids.has(queryKey[4]),
  });
}
