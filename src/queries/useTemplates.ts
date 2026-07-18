import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Database, supabase, type TemplateData } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import type { TemplateDraftInput } from "@/supabase/types/whatsapp_template_types";
import type {
  DataTablePage,
  DataTablePageParams,
} from "@/utils/DataTableUtils";

export type TemplateRecord =
  Database["public"]["Tables"]["message_templates"]["Row"];
export type TemplateListRow =
  Database["public"]["Functions"]["list_message_templates_page"]["Returns"][number];

export type TemplatePageParams = DataTablePageParams & {
  organizationAddress?: string;
  category?: string;
  status?: string;
};

const templateRecordKeys = {
  all: (organizationId?: string | null) =>
    ["template-records", organizationId] as const,
  page: (
    organizationId: string | null | undefined,
    params: TemplatePageParams,
  ) => ["template-records", organizationId, "page", params] as const,
  detail: (organizationId: string | null | undefined, id?: string) =>
    ["template-records", organizationId, "detail", id] as const,
};

async function invokeTemplateFunction<T>(
  path: string,
  method: "PUT" | "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown>,
) {
  return (await supabase.functions.invoke(path, {
    method,
    body,
  })) as unknown as { data: T | null; error: Error | null };
}

export function useTemplates(organizationAddress?: string) {
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: ["templates", activeOrgId, organizationAddress],
    queryFn: async () => {
      if (!organizationAddress) return [];

      const { data, error } = await supabase.functions.invoke(
        "whatsapp-management/templates",
        {
          method: "PUT",
          body: {
            organization_id: activeOrgId,
            organization_address: organizationAddress,
          },
        },
      );

      if (error) throw error;

      return (data?.data as TemplateData[] | undefined) || [];
    },
    enabled: !!activeOrgId && !!organizationAddress,
    retry: false,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      template,
      organizationAddress,
    }: {
      template: TemplateData;
      organizationAddress: string;
    }) => {
      const { error } = await supabase.functions.invoke(
        "whatsapp-management/templates",
        {
          method: "POST",
          body: {
            organization_id: activeOrgId,
            organization_address: organizationAddress,
            template,
          },
        },
      );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["templates", activeOrgId, variables.organizationAddress],
      });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      template,
      organizationAddress,
    }: {
      template: TemplateData;
      organizationAddress: string;
    }) => {
      const { error } = await supabase.functions.invoke(
        "whatsapp-management/templates",
        {
          method: "PATCH",
          body: {
            organization_id: activeOrgId,
            organization_address: organizationAddress,
            template,
          },
        },
      );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["templates", activeOrgId, variables.organizationAddress],
      });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      template,
      organizationAddress,
    }: {
      template: TemplateData;
      organizationAddress: string;
    }) => {
      const { error } = await supabase.functions.invoke(
        "whatsapp-management/templates",
        {
          method: "DELETE",
          body: {
            organization_id: activeOrgId,
            organization_address: organizationAddress,
            template,
          },
        },
      );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["templates", activeOrgId, variables.organizationAddress],
      });
    },
  });
}

export function useTemplateRecordsPage(params: TemplatePageParams) {
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: templateRecordKeys.page(activeOrgId, params),
    queryFn: async () => {
      const { data, error } = await invokeTemplateFunction<
        DataTablePage<TemplateListRow>
      >("whatsapp-management/templates/page", "PUT", {
        organization_id: activeOrgId,
        page: params.page,
        page_size: params.pageSize,
        search: params.search || undefined,
        organization_address: params.organizationAddress,
        category: params.category,
        status: params.status,
      });

      if (error) throw error;
      return data || { rows: [], total: 0 };
    },
    enabled: !!activeOrgId,
  });
}

export function useTemplateRecord(id?: string) {
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: templateRecordKeys.detail(activeOrgId, id),
    queryFn: async () => {
      const result = await supabase
        .from("message_templates")
        .select()
        .eq("organization_id", activeOrgId!)
        .eq("id", id!)
        .single()
        .throwOnError();

      return result.data as TemplateRecord;
    },
    enabled: !!activeOrgId && !!id,
  });
}

type TemplateDraftVariables = {
  organizationAddress: string;
  template: TemplateDraftInput;
};

export type SubmittedTemplateEditResult = {
  template: TemplateRecord;
  sync_pending: boolean;
};

function useInvalidateTemplateRecords() {
  const queryClient = useQueryClient();
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  return () =>
    queryClient.invalidateQueries({
      queryKey: templateRecordKeys.all(activeOrgId),
    });
}

export function useCreateTemplateDraft() {
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);
  const invalidate = useInvalidateTemplateRecords();

  return useMutation({
    mutationFn: async (variables: TemplateDraftVariables) => {
      const { data, error } = await invokeTemplateFunction<TemplateRecord>(
        "whatsapp-management/template-drafts",
        "POST",
        {
          organization_id: activeOrgId,
          organization_address: variables.organizationAddress,
          template: variables.template,
        },
      );
      if (error) throw error;
      return data!;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateTemplateDraft() {
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);
  const invalidate = useInvalidateTemplateRecords();

  return useMutation({
    mutationFn: async (
      variables: TemplateDraftVariables & { draftId: string },
    ) => {
      const { data, error } = await invokeTemplateFunction<TemplateRecord>(
        "whatsapp-management/template-drafts",
        "PATCH",
        {
          organization_id: activeOrgId,
          organization_address: variables.organizationAddress,
          draft_id: variables.draftId,
          template: variables.template,
        },
      );
      if (error) throw error;
      return data!;
    },
    onSuccess: invalidate,
  });
}

export function useSubmitTemplateDraft() {
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);
  const invalidate = useInvalidateTemplateRecords();

  return useMutation({
    mutationFn: async (
      variables: TemplateDraftVariables & { draftId: string },
    ) => {
      const { data, error } = await invokeTemplateFunction<TemplateRecord>(
        "whatsapp-management/template-drafts/submit",
        "POST",
        {
          organization_id: activeOrgId,
          organization_address: variables.organizationAddress,
          draft_id: variables.draftId,
          template: variables.template,
        },
      );
      if (error) throw error;
      return data!;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTemplateDraft() {
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);
  const invalidate = useInvalidateTemplateRecords();

  return useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await invokeTemplateFunction<{ success: boolean }>(
        "whatsapp-management/template-drafts",
        "DELETE",
        { organization_id: activeOrgId, draft_id: draftId },
      );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useEditSubmittedTemplate() {
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);
  const invalidate = useInvalidateTemplateRecords();

  return useMutation({
    mutationFn: async ({
      templateId,
      template,
    }: {
      templateId: string;
      template: TemplateDraftInput;
    }) => {
      const { data, error } =
        await invokeTemplateFunction<SubmittedTemplateEditResult>(
          `whatsapp-management/templates/${templateId}`,
          "PATCH",
          { organization_id: activeOrgId, template },
        );
      if (error) throw error;
      return data!;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteSubmittedTemplate() {
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);
  const invalidate = useInvalidateTemplateRecords();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await invokeTemplateFunction<{
        template: TemplateRecord;
      }>(`whatsapp-management/templates/${templateId}`, "DELETE", {
        organization_id: activeOrgId,
      });
      if (error) throw error;
      return data!;
    },
    onSuccess: invalidate,
  });
}

export function useSyncTemplates() {
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);
  const invalidate = useInvalidateTemplateRecords();

  return useMutation({
    mutationFn: async (organizationAddress: string) => {
      const { data, error } = await invokeTemplateFunction<{
        synced: number;
      }>("whatsapp-management/templates/sync", "POST", {
        organization_id: activeOrgId,
        organization_address: organizationAddress,
      });
      if (error) throw error;
      return data!;
    },
    onSuccess: invalidate,
  });
}
