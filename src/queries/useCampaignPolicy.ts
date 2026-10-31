import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useBoundStore from "@/stores/useBoundStore";
import { supabase, type Json } from "@/supabase/client";
import { readCampaignPolicy } from "@/utils/CampaignPolicyUtils";
import { queryKeys } from "./queryKeys";

export function useCampaignPolicy() {
  const orgId = useBoundStore((s) => s.ui.activeOrgId);
  const userId = useBoundStore((s) => s.ui.user?.id);
  return useQuery({
    queryKey: [orgId, "campaign-policy", userId],
    enabled: !!orgId && !!userId,
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 15000,
    queryFn: async ({ signal }) => {
      const { data } = await supabase
        .rpc("get_campaign_sending_policy", { p_organization_id: orgId! })
        .abortSignal(signal)
        .throwOnError();
      return readCampaignPolicy(data);
    },
  });
}
export function usePlatformCampaignPolicy(organizationId: string) {
  const userId = useBoundStore((s) => s.ui.user?.id);
  return useQuery({
    queryKey: ["platform-campaign-policy", userId, organizationId],
    enabled: !!userId && !!organizationId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async ({ signal }) => {
      const { data } = await supabase
        .rpc("get_platform_campaign_policy", {
          p_organization_id: organizationId,
        })
        .abortSignal(signal)
        .throwOnError();
      return readCampaignPolicy(data);
    },
  });
}
export function useSaveCampaignPolicy(organizationId: string) {
  const client = useQueryClient();
  const userId = useBoundStore((s) => s.ui.user?.id);
  return useMutation({
    mutationFn: async (input: {
      policy: Json;
      revision: number;
      requestId: string;
    }) => {
      const { data } = await supabase
        .rpc("update_platform_campaign_policy", {
          p_organization_id: organizationId,
          p_policy: input.policy,
          p_expected_revision: input.revision,
          p_request_id: input.requestId,
        })
        .throwOnError();
      return readCampaignPolicy(data);
    },
    onSuccess: (data) => {
      client.setQueryData(
        ["platform-campaign-policy", userId, organizationId],
        data,
      );
      void client.invalidateQueries({
        queryKey: [organizationId, "campaign-policy"],
      });
    },
  });
}
export function useCampaignSendingState(campaignId: string, enabled: boolean) {
  const orgId = useBoundStore((s) => s.ui.activeOrgId);
  const userId = useBoundStore((s) => s.ui.user?.id);
  return useQuery({
    queryKey: [orgId, "campaign-sending-state", userId, campaignId],
    enabled: !!orgId && !!userId && enabled,
    gcTime: 0,
    refetchInterval: 5000,
    queryFn: async ({ signal }) => {
      const { data } = await supabase
        .rpc("get_campaign_sending_state", {
          p_organization_id: orgId!,
          p_campaign_id: campaignId,
        })
        .abortSignal(signal)
        .throwOnError();
      return data as {
        waiting_count: number;
        next_at: string | null;
        reason: string | null;
      };
    },
  });
}
export function useCancelCampaign() {
  const orgId = useBoundStore((s) => s.ui.activeOrgId);
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      await supabase
        .rpc("cancel_campaign", {
          p_organization_id: orgId!,
          p_campaign_id: campaignId,
        })
        .throwOnError();
    },
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: queryKeys.campaigns.all(orgId),
      });
      void client.invalidateQueries({
        queryKey: [orgId, "campaign-sending-state"],
      });
    },
  });
}
