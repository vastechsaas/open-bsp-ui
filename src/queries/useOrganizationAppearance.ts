import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useBoundStore from "@/stores/useBoundStore";
import { type Database, supabase } from "@/supabase/client";
import { queryKeys } from "./queryKeys";

export const CHAT_BUBBLE_THEMES = [
  "orange",
  "green",
  "blue",
  "purple",
  "teal",
] as const;

export type ChatBubbleTheme = (typeof CHAT_BUBBLE_THEMES)[number];
export type OrganizationAppearanceSettings =
  Database["public"]["Tables"]["organization_ui_settings"]["Row"];

export function useOrganizationAppearanceSettings() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.organizationAppearance.detail(organizationId),
    queryFn: async ({ signal }) => {
      const result = await supabase
        .rpc("get_organization_ui_settings", {
          p_organization_id: organizationId!,
        })
        .abortSignal(signal)
        .throwOnError();
      return result.data as OrganizationAppearanceSettings;
    },
    enabled: !!organizationId,
  });
}

export function useUpdateOrganizationChatBubbleTheme() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const queryClient = useQueryClient();
  const queryKey = queryKeys.organizationAppearance.detail(organizationId);

  return useMutation({
    mutationFn: async (theme: ChatBubbleTheme) => {
      if (!organizationId) throw new Error("No active organization");
      const result = await supabase
        .rpc("update_organization_chat_bubble_theme", {
          p_organization_id: organizationId,
          p_theme: theme,
        })
        .throwOnError();
      return result.data as OrganizationAppearanceSettings;
    },
    onMutate: async (theme) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<OrganizationAppearanceSettings>(queryKey);
      if (previous) {
        queryClient.setQueryData<OrganizationAppearanceSettings>(queryKey, {
          ...previous,
          chat_bubble_theme: theme,
        });
      }
      return { previous };
    },
    onError: (_error, _theme, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous);
    },
    onSuccess: (settings) => queryClient.setQueryData(queryKey, settings),
  });
}
