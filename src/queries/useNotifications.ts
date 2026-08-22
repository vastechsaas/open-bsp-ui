import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import useBoundStore from "@/stores/useBoundStore";
import { supabase, type Tables } from "@/supabase/client";
import { queryKeys } from "./queryKeys";

export type UserNotification = Tables<"user_notifications">;
type NotificationRpcRow = UserNotification & { total_count: number };

type NotificationPage = {
  rows: UserNotification[];
  total: number;
};

const PAGE_SIZE = 10;

export function useNotificationsPage(page: number, unreadOnly: boolean) {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.notifications.page(organizationId, page, unreadOnly),
    queryFn: async (): Promise<NotificationPage> => {
      if (!organizationId) return { rows: [], total: 0 };

      const { data, error } = await supabase.rpc(
        "list_user_notifications_page",
        {
          p_organization_id: organizationId,
          p_page: page,
          p_page_size: PAGE_SIZE,
          p_unread_only: unreadOnly,
        },
      );
      if (error) throw error;

      const rows = (data ?? []) as NotificationRpcRow[];
      return {
        rows,
        total: Number(rows[0]?.total_count ?? 0),
      };
    },
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
  });
}

export function useUnreadNotificationCount() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(organizationId),
    queryFn: async () => {
      if (!organizationId) return 0;
      const { data, error } = await supabase.rpc(
        "get_unread_notification_count",
        { p_organization_id: organizationId },
      );
      if (error) throw error;
      return Number(data ?? 0);
    },
    enabled: !!organizationId,
  });
}

export function useMarkNotificationRead() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase.rpc(
        "mark_user_notification_read",
        { p_notification_id: notificationId },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.root(organizationId),
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!organizationId) return 0;
      const { data, error } = await supabase.rpc(
        "mark_all_user_notifications_read",
        { p_organization_id: organizationId },
      );
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.root(organizationId),
      });
    },
  });
}
