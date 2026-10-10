import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useBoundStore from "@/stores/useBoundStore";
import { supabase, type Tables } from "@/supabase/client";
import {
  notificationPreferenceKey,
  type NotificationType,
} from "@/utils/NotificationPreferenceUtils";

export type NotificationPreference = Pick<
  Tables<"organization_notification_preferences">,
  "notification_type" | "enabled"
>;

export function useNotificationPreferences(canManage: boolean) {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);

  return useQuery({
    queryKey: notificationPreferenceKey(organizationId, userId),
    queryFn: async ({ signal }): Promise<NotificationPreference[]> => {
      if (!organizationId || !userId)
        throw new Error("No active organization or user");
      const { data, error } = await supabase
        .rpc("get_organization_notification_preferences", {
          p_organization_id: organizationId,
        })
        .abortSignal(signal);
      if (error) throw error;
      return data ?? [];
    },
    enabled: canManage && !!organizationId && !!userId,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
}

export function useUpdateNotificationPreference() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const queryClient = useQueryClient();
  const queryKey = notificationPreferenceKey(organizationId, userId);

  return useMutation({
    mutationFn: async ({
      type,
      enabled,
    }: {
      type: NotificationType;
      enabled: boolean;
    }) => {
      if (!organizationId || !userId)
        throw new Error("No active organization or user");
      const { data, error } = await supabase.rpc(
        "update_organization_notification_preference",
        {
          p_organization_id: organizationId,
          p_notification_type: type,
          p_enabled: enabled,
        },
      );
      if (error) throw error;
      if (!data) throw new Error("Preference save returned no result");
      return data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
    },
    onSuccess: async (saved) => {
      const current = useBoundStore.getState().ui;
      if (current.activeOrgId !== organizationId || current.user?.id !== userId)
        return;
      queryClient.setQueryData<NotificationPreference[]>(queryKey, (previous) =>
        previous?.map((preference) =>
          preference.notification_type === saved.notification_type
            ? {
                notification_type: saved.notification_type,
                enabled: saved.enabled,
              }
            : preference,
        ),
      );
      await queryClient.invalidateQueries({ queryKey });
    },
    retry: false,
  });
}
