import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import type {
  OrganizationSetupResult,
  buildOrganizationSetupPayload,
} from "@/utils/OrganizationSetupUtils";
import { queryKeys } from "./queryKeys";
export class OrganizationSetupError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
// Passwords are passed directly to this function, never to mutation variables.
export async function organizationSetupRequest<T>(
  body: object,
  signal?: AbortSignal,
  expectedUserId?: string,
): Promise<T> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session || (expectedUserId && session.user.id !== expectedUserId))
    throw new OrganizationSetupError(401, "ONBOARDING_UNAUTHENTICATED");
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/organization-provisioning`,
    {
      method: "POST",
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    },
  );
  const value = (await response.json()) as T & { code?: string };
  if (!response.ok)
    throw new OrganizationSetupError(
      response.status,
      value.code ?? "ONBOARDING_INVALID_REQUEST",
    );
  return value;
}
export function useCreateOrganizationSetup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ReturnType<typeof buildOrganizationSetupPayload>) =>
      organizationSetupRequest<OrganizationSetupResult>(input),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.platform.root() }),
  });
}
export function useOrganizationSetup(
  provisioningId: string,
  initial?: OrganizationSetupResult,
) {
  const userId = useBoundStore((s) => s.ui.user?.id);
  return useQuery({
    queryKey: ["platform-organization-setup", userId, provisioningId],
    enabled: !!userId && !!provisioningId,
    queryFn: ({ signal }) =>
      organizationSetupRequest<OrganizationSetupResult>(
        { version: 2, action: "status", provisioning_id: provisioningId },
        signal,
        userId,
      ),
    initialData: initial,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
