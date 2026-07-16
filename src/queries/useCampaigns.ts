import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { type Database, type Json, supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import {
  type CampaignCsvRecipient,
  isCampaignProcessing,
} from "@/utils/CampaignUtils";
import { queryKeys } from "./queryKeys";

export type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignInsert =
  Database["public"]["Tables"]["campaigns"]["Insert"];
export type CampaignAudienceType =
  Database["public"]["Enums"]["campaign_audience_type"];

export type CampaignDraftInput = Omit<
  CampaignInsert,
  "organization_id" | "id" | "created_at" | "updated_at" | "status"
> & {
  csvRecipients?: CampaignCsvRecipient[];
  replaceCsvRecipients?: boolean;
};

function toCampaignInput(input: CampaignDraftInput) {
  return {
    audience_type: input.audience_type,
    created_by: input.created_by,
    name: input.name,
    organization_address: input.organization_address,
    service: input.service,
    template: input.template,
    template_variable_mapping: input.template_variable_mapping,
  } satisfies Omit<
    CampaignDraftInput,
    "csvRecipients" | "replaceCsvRecipients"
  >;
}

function toRecipientRows(
  organizationId: string,
  campaignId: string,
  recipients: CampaignCsvRecipient[],
) {
  return recipients.map((recipient) => ({
    organization_id: organizationId,
    campaign_id: campaignId,
    contact_address: recipient.contact_address,
    name: recipient.name,
    variables: recipient.variables as Json,
  }));
}

export function useCampaigns() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.campaigns.all(orgId),
    queryFn: async () =>
      await supabase
        .from("campaigns")
        .select()
        .eq("organization_id", orgId!)
        .order("updated_at", { ascending: false })
        .throwOnError(),
    enabled: !!orgId,
    select: (result) => result.data as CampaignRow[],
    refetchInterval: (query) => {
      const result = query.state.data;
      return result?.data?.some((campaign) =>
        isCampaignProcessing(campaign.status),
      )
        ? 3_000
        : false;
    },
  });
}

export function useCampaign(id: string | undefined) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.campaigns.detail(orgId, id),
    queryFn: async () =>
      await supabase
        .from("campaigns")
        .select()
        .eq("organization_id", orgId!)
        .eq("id", id!)
        .single()
        .throwOnError(),
    enabled: !!orgId && !!id,
    select: (result) => result.data as CampaignRow,
    refetchInterval: (query) =>
      isCampaignProcessing(query.state.data?.data?.status || "")
        ? 3_000
        : false,
  });
}

export function useCampaignAudienceCount(id: string | undefined) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: [...queryKeys.campaigns.audience(orgId, id), "count"],
    queryFn: async () =>
      await supabase
        .rpc("get_campaign_audience_count", {
          p_organization_id: orgId!,
          p_campaign_id: id!,
        })
        .throwOnError(),
    enabled: !!orgId && !!id,
    select: (result) => result.data,
  });
}

export function useCampaignAudienceCounts(ids: string[]) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [...queryKeys.campaigns.audience(orgId, id), "count"],
      queryFn: async () =>
        await supabase
          .rpc("get_campaign_audience_count", {
            p_organization_id: orgId!,
            p_campaign_id: id,
          })
          .throwOnError(),
      enabled: !!orgId,
      select: (result: { data: number | null }) => result.data,
    })),
  });
}

export function useCampaignAudiencePreview(id: string | undefined) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: [...queryKeys.campaigns.audience(orgId, id), "preview"],
    queryFn: async () =>
      await supabase
        .rpc("get_campaign_audience_preview", {
          p_organization_id: orgId!,
          p_campaign_id: id!,
          p_limit: 20,
        })
        .throwOnError(),
    enabled: !!orgId && !!id,
    select: (result) => result.data,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (input: CampaignDraftInput) => {
      if (!orgId) throw new Error("No active organization");
      const { csvRecipients = [] } = input;
      const campaignInput = toCampaignInput(input);

      const { data: campaign } = await supabase
        .from("campaigns")
        .insert({ ...campaignInput, organization_id: orgId })
        .select()
        .single()
        .throwOnError();

      try {
        if (campaign.audience_type === "csv_upload" && csvRecipients.length) {
          await supabase
            .from("campaign_csv_recipients")
            .insert(toRecipientRows(orgId, campaign.id, csvRecipients))
            .throwOnError();
        }
      } catch (error) {
        await supabase.from("campaigns").delete().eq("id", campaign.id);
        throw error;
      }

      return campaign as CampaignRow;
    },
    onSuccess: (campaign) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.all(orgId),
      });
      queryClient.setQueryData(queryKeys.campaigns.detail(orgId, campaign.id), {
        data: campaign,
        error: null,
      });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: CampaignDraftInput & { id: string }) => {
      if (!orgId) throw new Error("No active organization");
      const {
        csvRecipients = [],
        replaceCsvRecipients = false,
        ...campaignInput
      } = input;

      const { data: campaign } = await supabase
        .from("campaigns")
        .update(campaignInput)
        .eq("organization_id", orgId)
        .eq("id", id)
        .select()
        .single()
        .throwOnError();

      if (campaign.audience_type !== "csv_upload" || replaceCsvRecipients) {
        await supabase
          .from("campaign_csv_recipients")
          .delete()
          .eq("organization_id", orgId)
          .eq("campaign_id", id)
          .throwOnError();
      }

      if (
        campaign.audience_type === "csv_upload" &&
        replaceCsvRecipients &&
        csvRecipients.length
      ) {
        await supabase
          .from("campaign_csv_recipients")
          .insert(toRecipientRows(orgId, id, csvRecipients))
          .throwOnError();
      }

      return campaign as CampaignRow;
    },
    onSuccess: (campaign) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.all(orgId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.detail(orgId, campaign.id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.audience(orgId, campaign.id),
      });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error("No active organization");
      await supabase
        .from("campaigns")
        .delete()
        .eq("organization_id", orgId)
        .eq("id", id)
        .throwOnError();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.all(orgId),
      });
    },
  });
}

export function useStartCampaign() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (campaignId: string) => {
      if (!orgId) throw new Error("No active organization");

      const { data } = await supabase
        .rpc("start_campaign", {
          p_campaign_id: campaignId,
          p_organization_id: orgId,
        })
        .throwOnError();

      return data;
    },
    onSuccess: async (_recipientCount, campaignId) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.campaigns.all(orgId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.campaigns.detail(orgId, campaignId),
        }),
      ]);
    },
  });
}
