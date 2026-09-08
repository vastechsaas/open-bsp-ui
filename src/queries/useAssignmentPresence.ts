import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useBoundStore from "@/stores/useBoundStore";
import { supabase } from "@/supabase/client";
import { queryKeys } from "./queryKeys";

export type AssignmentPresence = {
  available: boolean;
  last_heartbeat_at: string | null;
  eligible: boolean;
  updated_at: string | null;
};

export function useAssignmentPresence(enabled: boolean) {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const queryClient = useQueryClient();
  const queryKey = queryKeys.assignmentPresence.current(organizationId);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await supabase
        .rpc("get_my_assignment_availability", {
          p_organization_id: organizationId!,
        })
        .single()
        .throwOnError();
      return result.data as AssignmentPresence;
    },
    enabled: enabled && !!organizationId,
  });
  useEffect(() => {
    if (!enabled || !organizationId || !query.data?.available) return;
    let stopped = false;
    const heartbeat = async () => {
      const result = await supabase
        .rpc("heartbeat_my_assignment_availability", {
          p_organization_id: organizationId,
        })
        .single();
      if (!stopped && !result.error)
        queryClient.setQueryData(queryKey, result.data);
    };
    void heartbeat();
    const timer = window.setInterval(() => void heartbeat(), 30_000);
    const resume = () => {
      if (document.visibilityState === "visible" && navigator.onLine)
        void heartbeat();
    };
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [enabled, organizationId, query.data?.available, queryClient, queryKey]);
  return query;
}

export function useSetAssignmentPresence() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const queryClient = useQueryClient();
  const queryKey = queryKeys.assignmentPresence.current(organizationId);
  return useMutation({
    mutationFn: async (available: boolean) => {
      const result = await supabase
        .rpc("set_my_assignment_availability", {
          p_organization_id: organizationId!,
          p_available: available,
        })
        .single()
        .throwOnError();
      return result.data as AssignmentPresence;
    },
    onSuccess: (presence) => queryClient.setQueryData(queryKey, presence),
  });
}
