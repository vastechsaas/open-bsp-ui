import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import {
  readServingBindingPages,
  type ChatbotServingSnapshot,
} from "@/utils/ChatbotServingUtils";
import { queryKeys } from "./queryKeys";
import { useChatbotPermissions } from "./useModulePermissions";

export function useChatbotServing(flowIds: string[]) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const ids = [...new Set(flowIds)].sort();
  const permissions = useChatbotPermissions();
  return useQuery<ChatbotServingSnapshot>({
    queryKey: queryKeys.chatbotFlows.serving(orgId, userId, ids),
    enabled:
      permissions.isSuccess &&
      permissions.data.can_view &&
      !!orgId &&
      !!userId &&
      ids.length > 0,
    staleTime: 0,
    refetchInterval: 10000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const [native, node] = await Promise.all([
        readServingBindingPages(async (from, to) => {
          const { data } = await supabase
            .from("chatbot_flow_deployments")
            .select(
              "flow_id,flow_version_id,organization_address,version:chatbot_flow_versions!chatbot_flow_deployments_version_fkey(version),number:organizations_addresses!chatbot_flow_deployments_address_fkey(status,phone_number:extra->>phone_number,chatbot_node_bridges(engine))",
            )
            .eq("organization_id", orgId!)
            .in("flow_id", ids)
            .order("organization_address")
            .range(from, to)
            .abortSignal(signal)
            .throwOnError();
          return data;
        }, signal),
        readServingBindingPages(async (from, to) => {
          const { data } = await supabase
            .from("chatbot_node_bridges")
            .select(
              "flow_id,flow_version_id,organization_address,engine,sync_status,version:chatbot_flow_versions!chatbot_node_bridges_organization_id_flow_version_id_fkey(version),number:organizations_addresses!chatbot_node_bridges_organization_id_organization_address_fkey(status,phone_number:extra->>phone_number)",
            )
            .eq("organization_id", orgId!)
            .in("flow_id", ids)
            .order("organization_address")
            .range(from, to)
            .abortSignal(signal)
            .throwOnError();
          return data;
        }, signal),
      ]);
      return { native, node };
    },
  });
}
