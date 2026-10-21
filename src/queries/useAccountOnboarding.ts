import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { platformMembersKey } from "./usePlatformTeamMembers";
import type { AccountSetupStatus } from "@/utils/AccountOnboardingUtils";

export async function accountOnboardingRequest<T>(
  body: object,
  accessToken?: string,
  signal?: AbortSignal,
): Promise<T> {
  const token =
    accessToken ??
    (await supabase.auth.getSession()).data.session?.access_token;
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/platform-user-onboarding`,
    {
      method: "POST",
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    },
  );
  const result = (await response.json()) as T & { code?: string };
  if (!response.ok) throw new Error(result.code ?? "ONBOARDING_UNAVAILABLE");
  return result;
}
// Secrets deliberately never enter React Query mutation variables/cache.
export function useAccountOnboarding(organizationId: string) {
  const client = useQueryClient();
  const userId = useBoundStore((s) => s.ui.user?.id);
  const runRef = useRef<(() => Promise<AccountSetupStatus>) | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      if (userId !== useBoundStore.getState().ui.user?.id)
        throw new Error("Account changed");
      const run = runRef.current;
      runRef.current = null;
      if (!run) throw new Error("ONBOARDING_BUSY");
      return run();
    },
    onSettled: async () => {
      await client.invalidateQueries({
        queryKey: platformMembersKey(organizationId),
      });
      await client.invalidateQueries({
        queryKey: ["platform", "tenant", organizationId],
      });
    },
  });
  return {
    ...mutation,
    mutateAsync: async (run: () => Promise<AccountSetupStatus>) => {
      if (runRef.current || mutation.isPending)
        throw new Error("ONBOARDING_BUSY");
      runRef.current = run;
      try {
        return await mutation.mutateAsync();
      } finally {
        runRef.current = null;
      }
    },
  };
}
