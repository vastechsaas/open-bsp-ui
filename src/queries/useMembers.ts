import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database, HumanAgentExtra } from "@/supabase/client";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import type { DataTablePageParams } from "@/utils/DataTableUtils";
import type {
  TeamMemberRole,
  TeamMemberStatus,
} from "@/utils/TeamMembersUtils";
import { queryKeys } from "./queryKeys";

export type TeamMemberListRow =
  Database["public"]["Functions"]["list_members_page"]["Returns"][number];

export type TeamMembersPageParams = DataTablePageParams & {
  role?: TeamMemberRole;
  status?: TeamMemberStatus;
};

export function useMembersPage(params: TeamMembersPageParams) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.members.page(orgId, params),
    queryFn: async () => {
      const result = await supabase
        .rpc("list_members_page", {
          p_organization_id: orgId!,
          p_page: params.page,
          p_page_size: params.pageSize,
          p_search: params.search || undefined,
          p_role: params.role,
          p_status: params.status,
        })
        .throwOnError();

      return {
        rows: result.data as TeamMemberListRow[],
        total: result.data[0]?.total_count || 0,
      };
    },
    enabled: !!orgId,
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      id,
      name,
      role,
    }: {
      id: string;
      name: string;
      role?: TeamMemberRole;
    }) => {
      if (!orgId) throw new Error("No active organization");

      const { data: existing } = await supabase
        .from("agents")
        .select("extra")
        .eq("organization_id", orgId)
        .eq("id", id)
        .eq("ai", false)
        .single()
        .throwOnError();

      const existingExtra = existing.extra as HumanAgentExtra;
      const extra = role ? { ...existingExtra, role } : existingExtra;
      const { data: member } = await supabase
        .from("agents")
        .update({ name, extra })
        .eq("organization_id", orgId)
        .eq("id", id)
        .eq("ai", false)
        .select()
        .single()
        .throwOnError();

      return member;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.members.all(orgId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agents.all(orgId),
      });
    },
  });
}
