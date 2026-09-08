import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/supabase/client";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import type { DataTablePageParams } from "@/utils/DataTableUtils";
import { queryKeys } from "./queryKeys";

export type QuickReply = Database["public"]["Tables"]["quick_replies"]["Row"];
export type QuickReplyListRow =
  Database["public"]["Functions"]["list_quick_replies_page"]["Returns"][number];

export function useQuickRepliesPage(params: DataTablePageParams) {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.quickReplies.page(organizationId, params),
    queryFn: async () => {
      const result = await supabase
        .rpc("list_quick_replies_page", {
          p_organization_id: organizationId!,
          p_page: params.page,
          p_page_size: params.pageSize,
          p_search: params.search || undefined,
        })
        .throwOnError();
      const rows = result.data as QuickReplyListRow[];

      return {
        rows,
        total: rows[0]?.total_count || 0,
      };
    },
    enabled: !!organizationId,
  });
}

export function useQuickReplyLibrary() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.quickReplies.library(organizationId),
    queryFn: async () => {
      const result = await supabase
        .rpc("list_quick_replies_page", {
          p_organization_id: organizationId!,
          p_page: 1,
          p_page_size: 50,
        })
        .throwOnError();

      return result.data as QuickReplyListRow[];
    },
    enabled: !!organizationId,
  });
}

function useInvalidateQuickReplies() {
  const queryClient = useQueryClient();
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);

  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.quickReplies.all(organizationId),
    });
}

export function useCreateQuickReply() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const invalidate = useInvalidateQuickReplies();

  return useMutation({
    mutationFn: async ({
      shortcut,
      content,
    }: {
      shortcut: string;
      content: string;
    }) => {
      if (!organizationId) throw new Error("No active organization");
      const result = await supabase
        .rpc("create_quick_reply", {
          p_organization_id: organizationId,
          p_shortcut: shortcut,
          p_content: content,
        })
        .throwOnError();
      return result.data as QuickReply;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateQuickReply() {
  const invalidate = useInvalidateQuickReplies();

  return useMutation({
    mutationFn: async ({
      id,
      shortcut,
      content,
    }: {
      id: string;
      shortcut: string;
      content: string;
    }) => {
      const result = await supabase
        .rpc("update_quick_reply", {
          p_quick_reply_id: id,
          p_shortcut: shortcut,
          p_content: content,
        })
        .throwOnError();
      return result.data as QuickReply;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteQuickReply() {
  const invalidate = useInvalidateQuickReplies();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await supabase
        .rpc("delete_quick_reply", { p_quick_reply_id: id })
        .throwOnError();
      return result.data;
    },
    onSuccess: invalidate,
  });
}
