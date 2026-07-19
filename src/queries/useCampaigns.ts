import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { type Database, type Json, supabase } from "@/supabase/client";
import type { MediaHeaderFormat } from "@/supabase/types/whatsapp_template_types";
import useBoundStore from "@/stores/useBoundStore";
import {
  type CampaignCsvRecipient,
  isCampaignProcessing,
} from "@/utils/CampaignUtils";
import type { DataTablePageParams } from "@/utils/DataTableUtils";
import { queryKeys } from "./queryKeys";

export type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignInsert =
  Database["public"]["Tables"]["campaigns"]["Insert"];
export type CampaignAudienceType =
  Database["public"]["Enums"]["campaign_audience_type"];
export type CampaignListRow =
  Database["public"]["Functions"]["list_campaigns_page"]["Returns"][number];

export type CampaignPageParams = DataTablePageParams & {
  audienceType?: CampaignAudienceType;
  readiness?: "ready" | "needs_attention";
};

export type CampaignDraftInput = Omit<
  CampaignInsert,
  "organization_id" | "id" | "created_at" | "updated_at" | "status"
> & {
  csvRecipients?: CampaignCsvRecipient[];
  replaceCsvRecipients?: boolean;
  headerMediaFile?: File;
};

export type CampaignHeaderMedia = {
  format: MediaHeaderFormat;
  media_id: string;
  file_name: string;
  mime_type: string;
  size: number;
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
    header_media: input.header_media,
  } satisfies Omit<
    CampaignDraftInput,
    "csvRecipients" | "replaceCsvRecipients" | "headerMediaFile"
  >;
}

async function uploadCampaignMedia(
  organizationId: string,
  organizationAddress: string,
  format: MediaHeaderFormat,
  file: File,
) {
  const form = new FormData();
  form.set("organization_id", organizationId);
  form.set("organization_address", organizationAddress);
  form.set("format", format);
  form.set("file", file);
  const { data, error } = await supabase.functions.invoke<CampaignHeaderMedia>(
    "whatsapp-management/campaign-media",
    { method: "POST", body: form },
  );
  if (error || !data) throw error || new Error("Campaign media upload failed");
  return data;
}

async function deleteMetaCampaignMedia(
  organizationId: string,
  organizationAddress: string,
  mediaId: string,
) {
  const { error } = await supabase.functions.invoke(
    `whatsapp-management/campaign-media/${mediaId}`,
    {
      method: "DELETE",
      body: {
        organization_id: organizationId,
        organization_address: organizationAddress,
      },
    },
  );
  if (error) throw error;
}

function mediaHeaderFormat(template: Json): MediaHeaderFormat | undefined {
  if (!template || Array.isArray(template) || typeof template !== "object") return;
  const components = Array.isArray(template.components) ? template.components : [];
  const header = components.find((component) =>
    component && !Array.isArray(component) && typeof component === "object" &&
    component.type === "HEADER" && typeof component.format === "string" &&
    ["IMAGE", "VIDEO", "DOCUMENT"].includes(component.format)
  );
  return header && !Array.isArray(header) && typeof header === "object"
    ? header.format as MediaHeaderFormat
    : undefined;
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

export function useCampaigns(params: CampaignPageParams) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.campaigns.page(orgId, params),
    queryFn: async () => {
      const result = await supabase
        .rpc("list_campaigns_page", {
          p_organization_id: orgId!,
          p_page: params.page,
          p_page_size: params.pageSize,
          p_search: params.search || undefined,
          p_audience_type: params.audienceType,
          p_readiness: params.readiness,
        })
        .throwOnError();

      return {
        rows: result.data as CampaignListRow[],
        total: result.data[0]?.total_count || 0,
      };
    },
    enabled: !!orgId,
    refetchInterval: (query) => {
      return query.state.data?.rows.some((campaign) =>
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
      const { csvRecipients = [], headerMediaFile } = input;
      let uploadedMedia: CampaignHeaderMedia | undefined;
      const format = mediaHeaderFormat(input.template);
      if (format && headerMediaFile) {
        uploadedMedia = await uploadCampaignMedia(orgId, input.organization_address, format, headerMediaFile);
      }
      const campaignInput = toCampaignInput({
        ...input,
        header_media: uploadedMedia || input.header_media || null,
      });
      let createdCampaignId: string | undefined;

      try {
        const { data: campaign } = await supabase
          .from("campaigns")
          .insert({ ...campaignInput, organization_id: orgId })
          .select()
          .single()
          .throwOnError();
        createdCampaignId = campaign.id;
        if (campaign.audience_type === "csv_upload" && csvRecipients.length) {
          await supabase
            .from("campaign_csv_recipients")
            .insert(toRecipientRows(orgId, campaign.id, csvRecipients))
            .throwOnError();
        }
        return campaign as CampaignRow;
      } catch (error) {
        if (createdCampaignId) {
          await supabase.from("campaigns").delete().eq("organization_id", orgId).eq("id", createdCampaignId);
        }
        if (uploadedMedia) {
          await deleteMetaCampaignMedia(orgId, input.organization_address, uploadedMedia.media_id).catch(() => undefined);
        }
        throw error;
      }
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
        headerMediaFile,
        ...campaignInput
      } = input;

      const { data: existingCampaign } = await supabase.from("campaigns")
        .select("header_media")
        .eq("organization_id", orgId)
        .eq("id", id)
        .single()
        .throwOnError();
      const previousMedia = existingCampaign.header_media as CampaignHeaderMedia | null;
      let uploadedMedia: CampaignHeaderMedia | undefined;
      const format = mediaHeaderFormat(campaignInput.template);
      if (format && headerMediaFile) {
        uploadedMedia = await uploadCampaignMedia(orgId, campaignInput.organization_address, format, headerMediaFile);
        campaignInput.header_media = uploadedMedia;
      }

      let campaign: CampaignRow;
      try {
        const result = await supabase
          .from("campaigns")
          .update(campaignInput)
          .eq("organization_id", orgId)
          .eq("id", id)
          .select()
          .single()
          .throwOnError();
        campaign = result.data as CampaignRow;
      } catch (error) {
        if (uploadedMedia) {
          await deleteMetaCampaignMedia(orgId, campaignInput.organization_address, uploadedMedia.media_id).catch(() => undefined);
        }
        throw error;
      }

      const persistedMedia = campaign.header_media as CampaignHeaderMedia | null;
      if (previousMedia?.media_id && previousMedia.media_id !== persistedMedia?.media_id) {
        await deleteMetaCampaignMedia(orgId, campaignInput.organization_address, previousMedia.media_id).catch(() => undefined);
      }

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
      const { data: campaign } = await supabase.from("campaigns")
        .select("organization_address, header_media")
        .eq("organization_id", orgId)
        .eq("id", id)
        .maybeSingle()
        .throwOnError();
      await supabase
        .from("campaigns")
        .delete()
        .eq("organization_id", orgId)
        .eq("id", id)
        .throwOnError();
      const media = campaign?.header_media as CampaignHeaderMedia | null;
      if (campaign && media?.media_id) {
        await deleteMetaCampaignMedia(orgId, campaign.organization_address, media.media_id).catch(() => undefined);
      }
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

      const { data, error } = await supabase.functions.invoke<{ queued_count: number }>(
        `whatsapp-management/campaigns/${campaignId}/start`,
        { method: "POST", body: { organization_id: orgId } },
      );
      if (error || !data) throw error || new Error("Campaign could not be started");
      return data.queued_count;
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

export function useCampaignMediaPreview(campaign?: CampaignRow) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const media = campaign?.header_media as CampaignHeaderMedia | null | undefined;
  return useQuery({
    queryKey: [
      "campaign-media",
      orgId,
      campaign?.id,
      campaign?.organization_address,
      media?.media_id,
    ],
    queryFn: async () => {
      const path = `whatsapp-management/campaign-media/${media!.media_id}?organization_id=${encodeURIComponent(orgId!)}&organization_address=${encodeURIComponent(campaign!.organization_address)}`;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Campaign media preview requires authentication");
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        },
      );
      if (!response.ok) throw new Error("Campaign media preview failed");
      return await response.blob();
    },
    enabled: !!orgId && !!campaign && !!media?.media_id,
    staleTime: 4 * 60 * 1000,
  });
}
