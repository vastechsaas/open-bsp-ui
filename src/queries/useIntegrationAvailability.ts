import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { useEffect } from "react";
import useBoundStore from "@/stores/useBoundStore";
import { supabase } from "@/supabase/client";
import type { IntegrationSettings } from "@/utils/IntegrationAvailabilityUtils";

export function useIntegrationAvailability() {
  const orgId = useBoundStore((s) => s.ui.activeOrgId);
  const userId = useBoundStore((s) => s.ui.user?.id);
  return useQuery({
    queryKey: [orgId, "integration-availability", userId],
    enabled: !!orgId && !!userId,
    queryFn: async ({ signal }) => {
      const { data } = await supabase
        .rpc("get_effective_integration_availability", {
          p_organization_id: orgId!,
        })
        .abortSignal(signal)
        .throwOnError();
      return data as IntegrationSettings;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

// One private subscription per authenticated layout; consumers share the query.
export function useIntegrationAvailabilityRefresh() {
  const client = useQueryClient();
  const orgId = useBoundStore((s) => s.ui.activeOrgId);
  const userId = useBoundStore((s) => s.ui.user?.id);
  useEffect(() => {
    if (!orgId || !userId) return;
    let disposed = false;
    const refresh = () =>
      void client.invalidateQueries({
        queryKey: [orgId, "integration-availability", userId],
      });
    const channel = supabase
      .channel(`integration-availability:${orgId}`, {
        config: { private: true },
      })
      .on("broadcast", { event: "integration-availability" }, refresh);
    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (disposed || !data.session) return;
        await supabase.realtime.setAuth(data.session.access_token);
        if (!disposed)
          channel.subscribe((status) => {
            if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) refresh();
          });
      })
      .catch(() => {
        if (!disposed) refresh();
      });
    return () => {
      disposed = true;
      void supabase.removeChannel(channel);
      void client.cancelQueries({
        queryKey: [orgId, "integration-availability", userId],
      });
      client.removeQueries({
        queryKey: [orgId, "integration-availability", userId],
      });
    };
  }, [client, orgId, userId]);
}

export function usePlatformIntegrationAvailability(organizationId: string) {
  const userId = useBoundStore((s) => s.ui.user?.id);
  return useQuery({
    queryKey: ["platform-integration-availability", userId, organizationId],
    enabled: !!userId && !!organizationId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async ({ signal }) => {
      const { data } = await supabase
        .rpc("get_platform_integration_availability", {
          p_organization_id: organizationId,
        })
        .abortSignal(signal)
        .throwOnError();
      return data as IntegrationSettings;
    },
  });
}

export function useSavePlatformIntegrationAvailability(organizationId: string) {
  const client = useQueryClient();
  const userId = useBoundStore((s) => s.ui.user?.id);
  return useMutation({
    mutationFn: async (input: {
      integrations: { id: string; enabled: boolean }[];
      revision: number;
      requestId: string;
    }) => {
      const { data } = await supabase
        .rpc("update_platform_integration_availability", {
          p_organization_id: organizationId,
          p_integrations: input.integrations,
          p_expected_revision: input.revision,
          p_request_id: input.requestId,
        })
        .throwOnError();
      return data as IntegrationSettings;
    },
    onSuccess: (data) => {
      client.setQueryData(
        ["platform-integration-availability", userId, organizationId],
        data,
      );
      void client.invalidateQueries({
        queryKey: [organizationId, "integration-availability"],
      });
    },
  });
}
