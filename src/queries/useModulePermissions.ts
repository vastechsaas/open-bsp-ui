import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { useEffect } from "react";
import useBoundStore from "@/stores/useBoundStore";
import { supabase } from "@/supabase/client";
import type {
  EffectiveModulePermissions,
  ModuleMatrix,
  ModulePermission,
} from "@/utils/ModulePermissionUtils";

export function useChatbotPermissions() {
  const orgId = useBoundStore((s) => s.ui.activeOrgId);
  const userId = useBoundStore((s) => s.ui.user?.id);
  return useQuery({
    queryKey: [orgId, "module-permissions", userId, "chatbot_builder"],
    enabled: !!orgId && !!userId,
    queryFn: async ({ signal }) => {
      const { data } = await supabase
        .rpc("get_effective_module_permissions", {
          p_organization_id: orgId!,
          p_module: "chatbot_builder",
        })
        .abortSignal(signal)
        .throwOnError();
      return data as EffectiveModulePermissions;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useModulePermissionRefresh() {
  const client = useQueryClient();
  const orgId = useBoundStore((s) => s.ui.activeOrgId);
  const userId = useBoundStore((s) => s.ui.user?.id);
  const permissions = useChatbotPermissions();
  useEffect(() => {
    if (!orgId || !userId) return;
    const refresh = () => {
      void client.invalidateQueries({
        queryKey: [orgId, "module-permissions", userId],
      });
    };
    let disposed = false;
    const channel = supabase
      .channel(`module-permissions:${orgId}`, { config: { private: true } })
      .on("broadcast", { event: "module-permissions" }, refresh);
    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (disposed || !data.session) return;
        await supabase.realtime.setAuth(data.session.access_token);
        if (disposed) return;
        channel.subscribe((status) => {
          if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) refresh();
        });
      })
      .catch(() => {
        if (!disposed) refresh();
      });
    return () => {
      disposed = true;
      void supabase.removeChannel(channel);
      void client.cancelQueries({
        queryKey: [orgId, "module-permissions", userId],
      });
      void client.cancelQueries({ queryKey: [orgId, "chatbot_flows"] });
      client.removeQueries({ queryKey: [orgId, "chatbot_flows"] });
      client.removeQueries({ queryKey: [orgId, "module-permissions", userId] });
    };
  }, [client, orgId, userId]);
  useEffect(() => {
    if (orgId && permissions.isSuccess && !permissions.data.can_view) {
      void client.cancelQueries({ queryKey: [orgId, "chatbot_flows"] });
      client.removeQueries({ queryKey: [orgId, "chatbot_flows"] });
    }
  }, [client, orgId, permissions.isSuccess, permissions.data?.can_view]);
}

export function usePlatformModulePermissions(organizationId: string) {
  const userId = useBoundStore((s) => s.ui.user?.id);
  return useQuery({
    queryKey: ["platform-module-permissions", userId, organizationId],
    enabled: !!userId && !!organizationId,
    // Preserve an unsaved matrix; Save detects conflicts and offers reload.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async ({ signal }) => {
      const { data } = await supabase
        .rpc("get_platform_module_permissions", {
          p_organization_id: organizationId,
          p_module: "chatbot_builder",
        })
        .abortSignal(signal)
        .throwOnError();
      return data as ModuleMatrix;
    },
  });
}

export function useSavePlatformModulePermissions(organizationId: string) {
  const client = useQueryClient();
  const userId = useBoundStore((s) => s.ui.user?.id);
  return useMutation({
    mutationFn: async (input: {
      permissions: ModulePermission[];
      revision: number;
      requestId: string;
    }) => {
      const { data } = await supabase
        .rpc("update_platform_module_permissions", {
          p_organization_id: organizationId,
          p_module: "chatbot_builder",
          p_permissions: input.permissions,
          p_expected_revision: input.revision,
          p_request_id: input.requestId,
        })
        .throwOnError();
      return data as ModuleMatrix;
    },
    onSuccess: (data) => {
      client.setQueryData(
        ["platform-module-permissions", userId, organizationId],
        data,
      );
      void client.invalidateQueries({
        queryKey: [organizationId, "module-permissions"],
      });
    },
  });
}
