import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import useBoundStore from "@/stores/useBoundStore";
import { supabase } from "@/supabase/client";
import { queryKeys } from "./queryKeys";

type ControlRequest = {
  action: "pause" | "resume";
  revision: number;
  requestId: string;
};

export function useCampaignControls(
  organizationId: string,
  campaignId: string,
) {
  const client = useQueryClient();
  const userId = useBoundStore((s) => s.ui.user?.id);
  const attempt = useRef<ControlRequest | null>(null);
  const mutation = useMutation({
    mutationKey: [organizationId, "campaign-controls", userId, campaignId],
    retry: false,
    mutationFn: async (input: {
      action: "pause" | "resume";
      revision: number;
      retry?: boolean;
    }) => {
      const inScope = () => {
        const ui = useBoundStore.getState().ui;
        return ui.activeOrgId === organizationId && ui.user?.id === userId;
      };
      const refresh = async () => {
        const result = await supabase
          .from("campaigns")
          .select()
          .eq("organization_id", organizationId)
          .eq("id", campaignId)
          .abortSignal(AbortSignal.timeout(15_000))
          .single()
          .throwOnError();
        if (!inScope()) throw new Error("scope_changed");
        // Reconcile only authoritative state, never optimistic control flags.
        await client.cancelQueries({
          queryKey: queryKeys.campaigns.detail(organizationId, campaignId),
        });
        client.setQueryData(
          queryKeys.campaigns.detail(organizationId, campaignId),
          result,
        );
        return result.data;
      };
      if (!inScope()) throw new Error("scope_changed");
      if (input.retry && attempt.current) {
        // A timeout may have committed. Read first, and never replay across a newer revision.
        const current = await refresh();
        if (current.control_revision !== attempt.current.revision) {
          attempt.current = null;
          return;
        }
      } else {
        attempt.current = {
          action: input.action,
          revision: input.revision,
          requestId: crypto.randomUUID(),
        };
      }
      const request = attempt.current!;
      const { error } = await supabase
        .rpc(
          request.action === "pause" ? "pause_campaign" : "resume_campaign",
          {
            p_organization_id: organizationId,
            p_campaign_id: campaignId,
            p_expected_revision: request.revision,
            p_request_id: request.requestId,
          },
        )
        .abortSignal(AbortSignal.timeout(20_000));
      let current;
      try {
        current = await refresh();
      } catch {
        throw new Error("unconfirmed");
      }
      if (error) {
        if (
          current.control_revision !== request.revision ||
          error.code === "40001"
        ) {
          attempt.current = null;
          throw new Error("conflict");
        }
        throw new Error("unconfirmed");
      }
      attempt.current = null;
    },
    onSettled: () => {
      if (
        useBoundStore.getState().ui.user?.id !== userId ||
        useBoundStore.getState().ui.activeOrgId !== organizationId
      )
        return;
      void client.invalidateQueries({
        queryKey: queryKeys.campaigns.all(organizationId),
      });
      void client.invalidateQueries({
        queryKey: [organizationId, "campaign-sending-state"],
      });
    },
  });
  return {
    ...mutation,
    retryControl: () => {
      const request = attempt.current;
      if (request) mutation.mutate({ ...request, retry: true });
    },
  };
}
