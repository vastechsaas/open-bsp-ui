import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import {
  accountSyncConfirmed,
  parseWhatsAppAccountSync,
} from "@/utils/WhatsAppAccountSyncUtils";

export function useWhatsAppAccountSync(address: string | undefined) {
  const organizationId = useBoundStore((s) => s.ui.activeOrgId);
  const userId = useBoundStore((s) => s.ui.user?.id);
  const client = useQueryClient();
  const queryKey = [organizationId, "whatsapp-account-sync", userId, address];
  const query = useQuery({
    queryKey,
    enabled: !!organizationId && !!userId && !!address,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .rpc("whatsapp_account_sync_status", {
          p_organization_id: organizationId!,
          p_address: address!,
        })
        .abortSignal(signal);
      if (error) throw error;
      return parseWhatsAppAccountSync(data);
    },
    refetchInterval: (query) =>
      query.state.data && !accountSyncConfirmed(query.state.data)
        ? 4000
        : 15000,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
    staleTime: 0,
  });
  const retry = useMutation({
    mutationFn: async () => {
      if (!organizationId || !userId || !address)
        throw new Error("No active organization");
      const { error } = await supabase.rpc("retry_whatsapp_account_sync", {
        p_organization_id: organizationId,
        p_address: address,
      });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey }),
  });
  return { query, retry };
}
