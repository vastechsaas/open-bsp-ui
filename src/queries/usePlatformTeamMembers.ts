import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, type Database } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import type { DataTablePageParams } from "@/utils/DataTableUtils";
import {
  stableMemberRequest,
  type PlatformMemberRole,
} from "@/utils/PlatformTeamMemberUtils";
import { queryKeys } from "./queryKeys";
import type { AccountSetupStatus } from "@/utils/AccountOnboardingUtils";

export type PlatformOrganizationMemberRow =
  Database["public"]["Functions"]["list_platform_organization_members_page"]["Returns"][number] & {
    setup?: AccountSetupStatus;
  };
export const platformMembersKey = (orgId: string) =>
  ["platform", "tenant", orgId, "members"] as const;

export function usePlatformOrganizationMembersPage(
  organizationId: string,
  params: DataTablePageParams,
) {
  const userId = useBoundStore((state) => state.ui.user?.id);
  return useQuery({
    queryKey: [...platformMembersKey(organizationId), userId, params],
    enabled: !!organizationId && !!userId,
    queryFn: async ({ signal }) => {
      const { data } = await supabase
        .rpc("list_platform_organization_members_page", {
          p_organization_id: organizationId,
          p_page: params.page,
          p_page_size: params.pageSize,
          p_search: params.search || undefined,
        })
        .abortSignal(signal)
        .throwOnError();
      const { data: setups } = data.length
        ? await supabase
            .rpc("list_platform_member_onboarding", {
              p_organization_id: organizationId,
              p_member_ids: data.map((member) => member.id),
            })
            .abortSignal(signal)
            .throwOnError()
        : { data: [] };
      return {
        rows: data.map((member) => ({
          ...member,
          setup: setups.find((setup) => setup.member_id === member.id),
        })),
        total: data[0]?.total_count ?? 0,
      };
    },
  });
}

type MemberMutation =
  | { action: "invite"; name: string; email: string; role: PlatformMemberRole }
  | {
      action: "update";
      member: PlatformOrganizationMemberRow;
      name: string;
      role: PlatformMemberRole;
      queueIds: string[];
    }
  | { action: "remove"; member: PlatformOrganizationMemberRow };

export function usePlatformMemberMutation(organizationId: string) {
  const client = useQueryClient();
  const userId = useBoundStore((state) => state.ui.user?.id);
  const request = useRef<ReturnType<typeof stableMemberRequest> | null>(null);
  return useMutation({
    mutationFn: async (input: MemberMutation) => {
      if (useBoundStore.getState().ui.user?.id !== userId)
        throw new Error("Account changed");
      request.current = stableMemberRequest(request.current, {
        organizationId,
        userId,
        ...input,
      });
      const p_request_id = request.current.id;
      if (input.action === "invite") {
        return (
          await supabase
            .rpc("create_platform_organization_member_invitation", {
              p_organization_id: organizationId,
              p_name: input.name.trim(),
              p_email: input.email.trim().toLowerCase(),
              p_role: input.role,
              p_request_id,
            })
            .throwOnError()
        ).data;
      }
      if (input.member.organization_id !== organizationId)
        throw new Error("Organization changed");
      if (input.action === "update") {
        return (
          await supabase
            .rpc("update_platform_organization_member", {
              p_member_id: input.member.id,
              p_name: input.name.trim(),
              p_role: input.role,
              p_routing_queue_ids: [...input.queueIds].sort(),
              p_expected_updated_at: input.member.updated_at,
              p_request_id,
            })
            .throwOnError()
        ).data;
      }
      return (
        await supabase
          .rpc("remove_platform_organization_member", {
            p_member_id: input.member.id,
            p_expected_updated_at: input.member.updated_at,
            p_request_id,
          })
          .throwOnError()
      ).data;
    },
    onSuccess: async () => {
      request.current = null;
      await Promise.allSettled([
        client.invalidateQueries({
          queryKey: platformMembersKey(organizationId),
        }),
        client.invalidateQueries({
          queryKey: queryKeys.platform.organizationAgents(organizationId),
        }),
        client.invalidateQueries({
          queryKey: queryKeys.platform.organizationQueues(organizationId),
        }),
        client.invalidateQueries({
          queryKey:
            queryKeys.platform.organizationAgentCapacity(organizationId),
        }),
        client.invalidateQueries({
          queryKey: queryKeys.platform.tenant(organizationId),
        }),
        client.invalidateQueries({
          queryKey: queryKeys.agents.all(organizationId),
        }),
        client.invalidateQueries({
          queryKey: queryKeys.members.all(organizationId),
        }),
        client.invalidateQueries({
          queryKey: [organizationId, "module-permissions"],
        }),
      ]);
    },
  });
}
