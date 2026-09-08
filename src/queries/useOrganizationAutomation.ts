import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useBoundStore from "@/stores/useBoundStore";
import { type Database, supabase } from "@/supabase/client";
import { queryKeys } from "./queryKeys";

export type OrganizationAutomationSettings =
  Database["public"]["Tables"]["organization_automation_settings"]["Row"];

export function useOrganizationAutomationSettings() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.organizationAutomation.detail(organizationId),
    queryFn: async ({ signal }) => {
      const result = await supabase
        .rpc("get_organization_automation_settings", {
          p_organization_id: organizationId!,
        })
        .abortSignal(signal)
        .throwOnError();
      return result.data as OrganizationAutomationSettings;
    },
    enabled: !!organizationId,
  });
}

export function useUpdateOrganizationContactAutoSave() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const queryClient = useQueryClient();
  const queryKey = queryKeys.organizationAutomation.detail(organizationId);

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!organizationId) throw new Error("No active organization");
      const result = await supabase
        .rpc("update_organization_contact_auto_save", {
          p_organization_id: organizationId,
          p_enabled: enabled,
        })
        .throwOnError();
      return result.data as OrganizationAutomationSettings;
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<OrganizationAutomationSettings>(queryKey);
      if (previous) {
        queryClient.setQueryData<OrganizationAutomationSettings>(queryKey, {
          ...previous,
          auto_save_whatsapp_contacts: enabled,
        });
      }
      return { previous };
    },
    onError: (_error, _enabled, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous);
    },
    onSuccess: (settings) => queryClient.setQueryData(queryKey, settings),
  });
}

export function useUpdateOrganizationAutoAssignment() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const queryClient = useQueryClient();
  const queryKey = queryKeys.organizationAutomation.detail(organizationId);
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!organizationId) throw new Error("No active organization");
      const result = await supabase
        .rpc("update_organization_auto_assignment", {
          p_organization_id: organizationId,
          p_enabled: enabled,
        })
        .throwOnError();
      return result.data as OrganizationAutomationSettings;
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<OrganizationAutomationSettings>(queryKey);
      if (previous)
        queryClient.setQueryData(queryKey, {
          ...previous,
          auto_assign_conversations: enabled,
        });
      return { previous };
    },
    onError: (_error, _enabled, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous);
    },
    onSuccess: (settings) => queryClient.setQueryData(queryKey, settings),
  });
}

export function usePlatformOrganizationAutomationSettings(
  organizationId: string,
) {
  return useQuery({
    queryKey: queryKeys.platform.organizationAutomation(organizationId),
    queryFn: async ({ signal }) => {
      const result = await supabase
        .rpc("get_platform_organization_automation_settings", {
          p_organization_id: organizationId,
        })
        .abortSignal(signal)
        .throwOnError();
      return result.data as OrganizationAutomationSettings;
    },
    enabled: !!organizationId,
  });
}

export function useUpdatePlatformOrganizationContactAutoSave(
  organizationId: string,
) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.platform.organizationAutomation(organizationId);

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const result = await supabase
        .rpc("update_platform_organization_contact_auto_save", {
          p_organization_id: organizationId,
          p_enabled: enabled,
          p_request_id: crypto.randomUUID(),
        })
        .throwOnError();
      return result.data as OrganizationAutomationSettings;
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<OrganizationAutomationSettings>(queryKey);
      if (previous) {
        queryClient.setQueryData<OrganizationAutomationSettings>(queryKey, {
          ...previous,
          auto_save_whatsapp_contacts: enabled,
        });
      }
      return { previous };
    },
    onError: (_error, _enabled, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous);
    },
    onSuccess: (settings) => queryClient.setQueryData(queryKey, settings),
  });
}

export function useUpdatePlatformOrganizationAutoAssignment(
  organizationId: string,
) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.platform.organizationAutomation(organizationId);
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const result = await supabase
        .rpc("update_platform_organization_auto_assignment", {
          p_organization_id: organizationId,
          p_enabled: enabled,
          p_request_id: crypto.randomUUID(),
        })
        .throwOnError();
      return result.data as OrganizationAutomationSettings;
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<OrganizationAutomationSettings>(queryKey);
      if (previous)
        queryClient.setQueryData(queryKey, {
          ...previous,
          auto_assign_conversations: enabled,
        });
      return { previous };
    },
    onError: (_error, _enabled, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous);
    },
    onSuccess: (settings) => queryClient.setQueryData(queryKey, settings),
  });
}
