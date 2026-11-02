import { useQuery } from "@tanstack/react-query";
import useBoundStore from "@/stores/useBoundStore";
import { supabase } from "@/supabase/client";
import {
  campaignActivityPage,
  receiptSummary,
} from "@/utils/CampaignActivityUtils";

export function useCampaignActivity(
  campaignId: string,
  page: number,
  pageSize: number,
) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const enabled = !!orgId && !!userId;
  const summary = useQuery({
    queryKey: [orgId, "campaigns", campaignId, "activity", userId, "summary"],
    enabled,
    queryFn: async ({ signal }) => {
      const { data } = await supabase
        .rpc("get_campaign_receipt_summary", {
          p_organization_id: orgId!,
          p_campaign_id: campaignId,
        })
        .abortSignal(signal)
        .throwOnError();
      return receiptSummary(data);
    },
    refetchInterval: 10_000,
  });
  const activity = useQuery({
    queryKey: [orgId, "campaigns", campaignId, "activity", userId, page, pageSize],
    enabled,
    queryFn: async ({ signal }) => {
      const { data } = await supabase
        .rpc("list_campaign_activity_page", {
          p_organization_id: orgId!,
          p_campaign_id: campaignId,
          p_page: page,
          p_page_size: pageSize,
        })
        .abortSignal(signal)
        .throwOnError();
      return campaignActivityPage(data ?? []);
    },
    refetchInterval: 10_000,
  });
  return { summary, activity };
}
